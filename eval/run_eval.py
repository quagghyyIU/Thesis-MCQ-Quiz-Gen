import argparse
import asyncio
import csv
import json
import math
import random
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, stdev

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = ROOT / "backend"
for path in (ROOT, BACKEND_PATH):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.config import GEMINI_MODEL, GROQ_MODEL, OLLAMA_MODEL  # type: ignore[reportMissingImports]
from app.prompts.v1 import VERSION as PROMPT_VERSION  # type: ignore[reportMissingImports]
from app.services.embedder import embed_text, embed_texts  # type: ignore[reportMissingImports]
from app.services import question_generator as qg  # type: ignore[reportMissingImports]
from app.services.question_generator import _call_llm_with_fallback, generate_questions  # type: ignore[reportMissingImports]

PROVIDER_MODEL_MAP = {
    "gemini": GEMINI_MODEL,
    "groq": GROQ_MODEL,
    "ollama": OLLAMA_MODEL,
}


def _summarize_providers(pairs: list[tuple[str, str]]) -> tuple[str, str]:
    counts = Counter(pairs)
    if not counts:
        return "unknown", "unknown"
    parts = [f"{prov}:{model} (x{n})" for (prov, model), n in counts.most_common()]
    primary_pair, _ = counts.most_common(1)[0]
    return primary_pair[0], ", ".join(parts)

from eval.cache import RateLimiter, cached  # type: ignore[reportMissingImports]

BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"]

LLM_LIMITER = RateLimiter(max_concurrency=1, min_interval_s=6.0)
EMBED_LIMITER = RateLimiter(max_concurrency=2, min_interval_s=0.6)


async def _with_retry(coro_factory, attempts: int = 4, base_delay: float = 8.0):
    last_exc: Exception | None = None
    for attempt in range(attempts):
        try:
            return await coro_factory()
        except Exception as exc:
            last_exc = exc
            message = str(exc).lower()
            if "429" not in message and "quota" not in message and "rate" not in message:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"  rate-limited, sleeping {delay:.0f}s (attempt {attempt + 1}/{attempts})")
            await asyncio.sleep(delay)
    if last_exc:
        raise last_exc


async def _embed_text(text: str) -> list[float]:
    async def _factory():
        async with EMBED_LIMITER:
            return await embed_text(text)
    return await cached("embed_text", {"t": text}, _factory)


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    async def _factory():
        async with EMBED_LIMITER:
            return await embed_texts(texts)
    return await cached("embed_texts", {"t": texts}, _factory)


async def _generate(payload: dict) -> dict:
    force_provider = payload.get("force_provider")
    force_model = payload.get("force_model")

    async def _inner():
        async with LLM_LIMITER:
            qg._cache.clear()
            return await generate_questions(
                document_id=payload["document_id"],
                chunks=payload["chunks"],
                num_questions=payload["num_questions"],
                question_types=payload["question_types"],
                language=payload["language"],
                pattern=payload.get("pattern"),
                force_provider=force_provider,
                force_model=force_model,
                user_id=None,
                db_log=False,
            )

    async def _factory():
        questions, prompt_used, tokens, provider, model, prompt_version = await _with_retry(_inner)
        return {
            "questions": questions,
            "prompt_used": prompt_used,
            "tokens": tokens,
            "provider": provider,
            "model": model,
            "prompt_version": prompt_version,
        }
    cache_key = {
        "chunks": payload["chunks"],
        "num_questions": payload["num_questions"],
        "question_types": payload["question_types"],
        "language": payload["language"],
        "pattern": payload.get("pattern"),
        "prompt_version": PROMPT_VERSION,
        "force_provider": force_provider,
        "force_model": force_model,
        "repeat_idx": payload.get("repeat_idx", 0),
    }
    return await cached("generate", cache_key, _factory)


async def _judge(questions: list[dict], source_text: str, expected_count: int = 0) -> float:
    if not questions:
        return 1.0
    actual = len(questions)
    coverage_clause = ""
    if expected_count > 0:
        coverage_clause = (
            f"The user requested {expected_count} questions; only {actual} were generated. "
            f"If {actual} < {expected_count}, deduct 2 points from EACH of the four criteria. "
            f"If {actual} == 0, return all 1s.\n"
        )
    prompt = (
        "You are a STRICT examiner grading exam-question quality.\n"
        "Score four criteria as integers 1-5 using this RUBRIC:\n"
        "- relevance: 5 = every question stays on topic; 3 = half drift; 1 = off topic.\n"
        "- correctness: 5 = every answer is correct and options are not misleading; 3 = a few errors; 1 = many errors.\n"
        "- clarity: 5 = good grammar and unambiguous; 3 = understandable; 1 = confusing.\n"
        "- groundedness: 5 = every fact is supported by the source; 3 = some speculation; 1 = fabricated.\n"
        f"{coverage_clause}"
        "IMPORTANT: do NOT give 5 unless near-perfect. Use the full 2-4 range. "
        "Deduct points whenever you spot any flaw. After deductions, clamp each score to [1, 5].\n"
        "Return only JSON: {\"relevance\":n,\"correctness\":n,\"clarity\":n,\"groundedness\":n}.\n\n"
        f"Source:\n{source_text[:5000]}\n\n"
        f"Questions:\n{json.dumps(questions[:8], ensure_ascii=False)}"
    )

    async def _inner_call():
        async with LLM_LIMITER:
            return await _call_llm_with_fallback("Return valid JSON only, no markdown.", prompt)

    async def _factory():
        try:
            text, _, _ = await _with_retry(_inner_call)
        except Exception as exc:
            print(f"  judge: provider failure ({type(exc).__name__}); skipping with neutral score 3.0")
            return 3.0
        try:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.rstrip().endswith("```"):
                    cleaned = cleaned.rstrip()[:-3]
            payload = json.loads(cleaned)
            values = [
                max(1.0, min(5.0, float(payload.get("relevance", 0)))),
                max(1.0, min(5.0, float(payload.get("correctness", 0)))),
                max(1.0, min(5.0, float(payload.get("clarity", 0)))),
                max(1.0, min(5.0, float(payload.get("groundedness", 0)))),
            ]
            return float(mean(values))
        except Exception:
            return 0.0

    return await cached("judge", {"prompt": prompt, "expected": expected_count, "actual": actual}, _factory)


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    return float(np.dot(a, b) / denom)


def _recall_at_k(retrieved: list[int], ground_truth: set[int], top_k: int) -> float:
    if not ground_truth:
        return 0.0
    hits = sum(1 for idx in retrieved[:top_k] if idx in ground_truth)
    return hits / len(ground_truth)


def _mrr(retrieved: list[int], ground_truth: set[int]) -> float:
    for rank, idx in enumerate(retrieved, start=1):
        if idx in ground_truth:
            return 1.0 / rank
    return 0.0


def _bloom_distribution(questions: list[dict]) -> dict[str, float]:
    if not questions:
        return {level: 0.0 for level in BLOOM_LEVELS}
    counts = Counter(q.get("bloom_level", "remember") for q in questions)
    total = sum(counts.values())
    return {level: counts.get(level, 0) / total for level in BLOOM_LEVELS}


def _kl_divergence(target: dict[str, float], output: dict[str, float]) -> float:
    epsilon = 1e-12
    value = 0.0
    for level in BLOOM_LEVELS:
        p = max(target.get(level, 0.0), epsilon)
        q = max(output.get(level, 0.0), epsilon)
        value += p * math.log(p / q)
    return float(value)


def _target_distribution(topic: dict) -> dict[str, float]:
    target = topic.get("target_bloom_distribution", {})
    out = {level: float(target.get(level, 0.0)) for level in BLOOM_LEVELS}
    total = sum(out.values())
    if total <= 0:
        out["understand"] = 1.0
        return out
    return {level: value / total for level, value in out.items()}


def _split_to_chunks(full_text: str, chunk_size: int = 300, overlap: int = 60) -> list[str]:
    words = full_text.split()
    if not words:
        return [full_text]
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(end - overlap, 0)
    return chunks


async def _retrieve_indices(query: str, chunk_vecs: list[list[float]], top_k: int) -> list[int]:
    if not chunk_vecs:
        return []
    query_vec = await _embed_text(query)
    scores = [(_cosine_similarity(query_vec, vec), idx) for idx, vec in enumerate(chunk_vecs)]
    scores.sort(key=lambda item: item[0], reverse=True)
    return [idx for _, idx in scores[:top_k]]


async def _semantic_grounding(question_embeddings: list[list[float]], chunk_embeddings: list[list[float]]) -> float:
    if not question_embeddings or not chunk_embeddings:
        return 0.0
    scores = []
    for q_emb in question_embeddings:
        max_cos = max(_cosine_similarity(q_emb, c_emb) for c_emb in chunk_embeddings)
        scores.append((max_cos + 1) / 2)
    return float(mean(scores)) if scores else 0.0


def _diversity_score(question_embeddings: list[list[float]]) -> float:
    if len(question_embeddings) < 2:
        return 0.0
    sims = []
    for i in range(len(question_embeddings)):
        for j in range(i + 1, len(question_embeddings)):
            sims.append((_cosine_similarity(question_embeddings[i], question_embeddings[j]) + 1) / 2)
    return float(1 - mean(sims)) if sims else 0.0


async def _run_baseline(dataset: dict, baseline: dict, defaults: dict, doc_chunk_cache: dict, repeat_idx: int = 0) -> tuple[dict, list[dict]]:
    topic_metrics = []
    detail_rows = []
    exam = dataset["exams"][0] if dataset.get("exams") else None
    for doc in dataset["docs"]:
        raw_text = " ".join(doc["chunks"])
        if doc["id"] not in doc_chunk_cache:
            generated_chunks = list(doc["chunks"])
            chunk_vecs = await _embed_texts(generated_chunks)
            doc_chunk_cache[doc["id"]] = (generated_chunks, chunk_vecs)
        generated_chunks, chunk_vecs = doc_chunk_cache[doc["id"]]

        for topic in doc.get("topics", []):
            top_k = int(baseline.get("top_k", defaults.get("top_k", 3)))
            retrieved_indices = await _retrieve_indices(topic["prompt"], chunk_vecs, top_k)
            ground_truth = set(topic.get("ground_truth_chunks", []))
            recall = _recall_at_k(retrieved_indices, ground_truth, top_k)
            mrr_score = _mrr(retrieved_indices, ground_truth)

            if baseline["mode"] == "vanilla":
                generation_chunks = [raw_text]
                pattern = None
            elif baseline["mode"] == "rag_only":
                generation_chunks = [generated_chunks[idx] for idx in retrieved_indices] or generated_chunks[:top_k]
                pattern = None
            else:
                generation_chunks = [generated_chunks[idx] for idx in retrieved_indices] or generated_chunks[:top_k]
                pattern = {
                    "pattern_config": {
                        "difficulty_distribution": exam.get("difficulty_distribution", {}) if exam else {},
                        "question_types": {qt: 1 for qt in exam.get("question_types", ["mcq"])} if exam else {"mcq": 1},
                    },
                    "sample_questions": exam.get("sample_questions", []) if exam else [],
                } if baseline.get("use_pattern", False) else None

            try:
                gen = await _generate(
                    {
                        "document_id": -1,
                        "chunks": generation_chunks,
                        "num_questions": int(defaults.get("num_questions", 6)),
                        "question_types": defaults.get("question_types", ["mcq"]),
                        "language": doc.get("language", "en"),
                        "pattern": pattern,
                        "force_provider": baseline.get("force_provider"),
                        "force_model": baseline.get("force_model"),
                        "repeat_idx": repeat_idx,
                    }
                )
                questions = gen["questions"]
            except Exception as exc:
                print(f"  [{baseline['name']}/{doc['id']}/{topic['id']}] generation failed: {type(exc).__name__}: {exc}")
                continue

            question_texts = [
                t for t in (
                    f"{q.get('question', '')} {q.get('answer', '')} {q.get('explanation', '')}".strip()
                    for q in questions
                ) if t
            ]
            question_embeddings = await _embed_texts(question_texts) if question_texts else []
            chunk_embeddings = [chunk_vecs[idx] for idx in retrieved_indices] if retrieved_indices else chunk_vecs[:top_k]

            grounding = await _semantic_grounding(question_embeddings, chunk_embeddings)
            target = _target_distribution(topic)
            bloom_kl = _kl_divergence(target, _bloom_distribution(questions))
            judge = await _judge(questions, raw_text, expected_count=int(defaults.get("num_questions", 6)))
            diversity = _diversity_score(question_embeddings)

            actual_provider = gen.get("provider", "unknown")
            actual_model = gen.get("model") or baseline.get("force_model") or PROVIDER_MODEL_MAP.get(actual_provider, "unknown")
            topic_metrics.append(
                {
                    "recall_at_k": recall,
                    "mrr": mrr_score,
                    "semantic_grounding": grounding,
                    "bloom_kl": bloom_kl,
                    "llm_judge": judge,
                    "diversity": diversity,
                    "questions_returned": float(len(questions)),
                    "provider": actual_provider,
                    "model": actual_model,
                }
            )
            detail_rows.append(
                {
                    "repeat_idx": repeat_idx,
                    "name": baseline["name"],
                    "doc_id": doc["id"],
                    "topic_id": topic["id"],
                    "provider": actual_provider,
                    "model": actual_model,
                    "recall_at_k": recall,
                    "mrr": mrr_score,
                    "semantic_grounding": grounding,
                    "bloom_kl": bloom_kl,
                    "llm_judge": judge,
                    "diversity": diversity,
                    "questions_returned": float(len(questions)),
                    "prompt_version": PROMPT_VERSION,
                }
            )
            print(
                f"  [{baseline['name']}/{doc['id']}/{topic['id']}] "
                f"provider={actual_provider} model={actual_model} q={len(questions)} judge={judge:.2f} grounding={grounding:.2f}"
            )

    if not topic_metrics:
        return {
            "name": baseline["name"],
            **{k: 0.0 for k in ["recall_at_k", "mrr", "semantic_grounding", "bloom_kl", "llm_judge", "diversity", "questions_returned"]},
            "prompt_version": PROMPT_VERSION,
            "provider": "unknown",
            "model": "unknown",
        }, detail_rows

    provider, model = _summarize_providers([(item["provider"], item["model"]) for item in topic_metrics])
    return {
        "name": baseline["name"],
        "recall_at_k": mean(item["recall_at_k"] for item in topic_metrics),
        "mrr": mean(item["mrr"] for item in topic_metrics),
        "semantic_grounding": mean(item["semantic_grounding"] for item in topic_metrics),
        "bloom_kl": mean(item["bloom_kl"] for item in topic_metrics),
        "llm_judge": mean(item["llm_judge"] for item in topic_metrics),
        "diversity": mean(item["diversity"] for item in topic_metrics),
        "questions_returned": mean(item["questions_returned"] for item in topic_metrics),
        "prompt_version": PROMPT_VERSION,
        "provider": provider,
        "model": model,
    }, detail_rows


async def run(config_path: str, name_filter: list[str] | None = None) -> list[dict]:
    config = yaml.safe_load((ROOT / config_path).read_text(encoding="utf-8"))
    defaults = config.get("defaults", {})
    random.seed(int(defaults.get("seed", 42)))
    np.random.seed(int(defaults.get("seed", 42)))

    dataset = json.loads((ROOT / config["datasets"]["path"]).read_text(encoding="utf-8"))
    baselines = config.get("baselines", [])
    if name_filter:
        baselines = [b for b in baselines if b["name"] in name_filter or any(b["name"].startswith(f) for f in name_filter)]

    run_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    doc_chunk_cache: dict = {}
    repeats = int(defaults.get("repeats", 1))
    rows = []
    detail_rows = []
    for baseline in baselines:
        print(f"== Running {baseline['name']} ==")
        baseline_runs = []
        for repeat_idx in range(repeats):
            print(f"  repeat {repeat_idx + 1}/{repeats}")
            summary, details = await _run_baseline(dataset, baseline, defaults, doc_chunk_cache, repeat_idx)
            baseline_runs.append(summary)
            detail_rows.extend(details)
        rows.append(_aggregate_repeats(baseline_runs))

    for row in rows:
        row["run_id"] = run_id
    for row in detail_rows:
        row["run_id"] = run_id

    output_path = ROOT / config["output"]["comparison_csv"]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _write_csv(output_path, rows)
    _append_runs_csv(output_path.parent / "runs.csv", rows)
    _write_details_csv(output_path.parent / "details.csv", detail_rows)
    _write_failure_analysis(output_path.parent / "failure_analysis.md", run_id, detail_rows)
    _append_history(output_path.parent / "history.md", run_id, rows)
    _print_table(rows)
    return rows


METRIC_FIELDS = ["recall_at_k", "mrr", "semantic_grounding", "bloom_kl", "llm_judge", "diversity", "questions_returned"]


def _std(values: list[float]) -> float:
    return stdev(values) if len(values) > 1 else 0.0


def _aggregate_repeats(rows: list[dict]) -> dict:
    if not rows:
        return {}
    out = {
        "name": rows[0]["name"],
        "provider": rows[0].get("provider", "unknown"),
        "model": rows[0].get("model", "unknown"),
        "prompt_version": rows[0].get("prompt_version", PROMPT_VERSION),
        "repeats": len(rows),
    }
    for field in METRIC_FIELDS:
        values = [float(row.get(field, 0.0)) for row in rows]
        out[field] = mean(values)
        out[f"{field}_mean"] = mean(values)
        out[f"{field}_std"] = _std(values)
    return out


def _fmt_row(row: dict) -> dict:
    return {
        "run_id": row["run_id"],
        "name": row["name"],
        "provider": row.get("provider", "unknown"),
        "model": row.get("model", "unknown"),
        "repeats": row.get("repeats", 1),
        "recall_at_k": f"{row['recall_at_k']:.4f}",
        "mrr": f"{row['mrr']:.4f}",
        "semantic_grounding": f"{row['semantic_grounding']:.4f}",
        "bloom_kl": f"{row['bloom_kl']:.4f}",
        "llm_judge": f"{row['llm_judge']:.4f}",
        "diversity": f"{row['diversity']:.4f}",
        "questions_returned": f"{row.get('questions_returned', 0.0):.2f}",
        **{
            f"{field}_{suffix}": f"{row.get(f'{field}_{suffix}', row.get(field, 0.0)):.4f}"
            for field in METRIC_FIELDS
            for suffix in ("mean", "std")
        },
        "prompt_version": row["prompt_version"],
    }


CSV_FIELDS = [
    "run_id", "name", "provider", "model", "repeats",
    "recall_at_k", "mrr", "semantic_grounding", "bloom_kl",
    "llm_judge", "diversity", "questions_returned", "prompt_version",
    *[f"{field}_{suffix}" for field in METRIC_FIELDS for suffix in ("mean", "std")],
]

DETAIL_FIELDS = [
    "run_id", "repeat_idx", "name", "doc_id", "topic_id", "provider", "model",
    "recall_at_k", "mrr", "semantic_grounding", "bloom_kl",
    "llm_judge", "diversity", "questions_returned", "prompt_version",
]


def _write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(_fmt_row(row))


def _append_runs_csv(path: Path, rows: list[dict]) -> None:
    existing_rows: list[dict] = []
    if path.exists():
        with path.open(encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            if reader.fieldnames and reader.fieldnames != CSV_FIELDS:
                existing_rows = list(reader)

    mode = "w" if existing_rows else "a"
    new_file = not path.exists() or bool(existing_rows)
    with path.open(mode, encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        if new_file:
            writer.writeheader()
        for row in existing_rows:
            writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
        for row in rows:
            writer.writerow(_fmt_row(row))


def _write_details_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=DETAIL_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                **row,
                **{
                    key: f"{float(row[key]):.4f}"
                    for key in ["recall_at_k", "mrr", "semantic_grounding", "bloom_kl", "llm_judge", "diversity", "questions_returned"]
                },
            })


def _write_failure_analysis(path: Path, run_id: str, rows: list[dict]) -> None:
    failures = []
    for row in rows:
        triggers = []
        if row["semantic_grounding"] < 0.7:
            triggers.append(("Low grounding", row["semantic_grounding"], "Generated content may not be strongly supported by retrieved chunks."))
        if row["bloom_kl"] > 8:
            triggers.append(("Bloom mismatch", row["bloom_kl"], "Output Bloom distribution drifted from the topic target."))
        if row["llm_judge"] < 4:
            triggers.append(("Low judge score", row["llm_judge"], "Quality judge found relevance, correctness, clarity, or grounding issues."))
        if row["questions_returned"] < 6:
            triggers.append(("Incomplete output", row["questions_returned"], "Model returned fewer questions than requested."))
        for trigger, value, reason in triggers:
            failures.append((row, trigger, value, reason))

    lines = [
        f"# Failure Analysis - {run_id}",
        "",
        "This table lists low-performing topic-level cases for thesis discussion. Common causes include weak retrieval grounding, Bloom distribution drift, and incomplete model output.",
        "",
        "| Baseline | Repeat | Document | Topic | Trigger | Value | Likely reason | Suggested mitigation |",
        "| --- | ---: | --- | --- | --- | ---: | --- | --- |",
    ]
    for row, trigger, value, reason in failures[:80]:
        mitigation = (
            "Improve retrieval query/prompt constraints and keep lecturer review in the loop."
            if trigger == "Low grounding"
            else "Strengthen Bloom examples or adjust target pattern instructions."
            if trigger == "Bloom mismatch"
            else "Use stricter JSON/schema repair and retry policy."
            if trigger == "Incomplete output"
            else "Inspect generated item and refine prompt rubric."
        )
        lines.append(
            "| " + " | ".join([
                str(row["name"]),
                str(int(row["repeat_idx"]) + 1),
                str(row["doc_id"]),
                str(row["topic_id"]),
                trigger,
                f"{float(value):.3f}",
                reason,
                mitigation,
            ]) + " |"
        )
    if not failures:
        lines.append("| All | - | - | - | No major failures | - | All tracked metrics passed thresholds. | Keep current setup. |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _append_history(path: Path, run_id: str, rows: list[dict]) -> None:
    headers = ["baseline", "provider", "model", "repeats", "recall@k", "mrr", "grounding", "bloom_kl", "judge", "diversity", "q_returned", "prompt"]
    lines = [
        f"## Run {run_id}",
        "",
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in rows:
        lines.append(
            "| " + " | ".join([
                row["name"],
                row.get("provider", "unknown"),
                row.get("model", "unknown"),
                str(row.get("repeats", 1)),
                f"{row['recall_at_k']:.3f}",
                f"{row['mrr']:.3f}",
                f"{row['semantic_grounding']:.3f}",
                f"{row['bloom_kl']:.3f}",
                f"{row['llm_judge']:.3f}",
                f"{row['diversity']:.3f}",
                f"{row.get('questions_returned', 0.0):.2f}",
                row["prompt_version"],
            ]) + " |"
        )
    block = "\n".join(lines) + "\n\n"

    if path.exists():
        existing = path.read_text(encoding="utf-8")
    else:
        existing = "# Evaluation History\n\nEach section is one full eval run. Newest first.\n\n"
    header, _, tail = existing.partition("\n\n")
    if header.startswith("# "):
        path.write_text(header + "\n\n" + block + tail, encoding="utf-8")
    else:
        path.write_text(block + existing, encoding="utf-8")


def _print_table(rows: list[dict]) -> None:
    cols = ["name", "provider", "model", "recall@k", "mrr", "ground", "blm_kl", "judge", "diver", "q_ret"]
    data = [
        [
            row["name"],
            row.get("provider", "unknown"),
            row.get("model", "unknown"),
            f"{row['recall_at_k']:.3f}",
            f"{row['mrr']:.3f}",
            f"{row['semantic_grounding']:.3f}",
            f"{row['bloom_kl']:.3f}",
            f"{row['llm_judge']:.3f}",
            f"{row['diversity']:.3f}",
            f"{row.get('questions_returned', 0.0):.1f}",
        ]
        for row in rows
    ]
    widths = [max(len(c), *(len(r[i]) for r in data)) for i, c in enumerate(cols)]
    fmt = " | ".join("{:<" + str(w) + "}" for w in widths)
    print("\n" + fmt.format(*cols))
    print("-+-".join("-" * w for w in widths))
    for r in data:
        print(fmt.format(*r))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run thesis evaluation baselines.")
    parser.add_argument("--config", default="eval/config.yaml")
    parser.add_argument("--baselines", nargs="*", default=None,
                        help="Filter by baseline names or prefixes (e.g. model_)")
    args = parser.parse_args()
    asyncio.run(run(args.config, name_filter=args.baselines))


if __name__ == "__main__":
    main()
