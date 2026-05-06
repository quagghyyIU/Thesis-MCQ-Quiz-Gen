import argparse
import asyncio
import csv
import json
import math
import random
import re
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

from app.config import (  # type: ignore[reportMissingImports]
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GROQ_MODEL,
    OLLAMA_MODEL,
    OPENROUTER_EMBEDDING_MODEL,
    OPENROUTER_MODEL,
)
from app.prompts.v1 import VERSION as PROMPT_VERSION  # type: ignore[reportMissingImports]
from app.services.embedder import embed_text, embed_texts  # type: ignore[reportMissingImports]
from app.services import question_generator as qg  # type: ignore[reportMissingImports]
from app.services.question_generator import _call_llm_with_fallback, generate_questions  # type: ignore[reportMissingImports]

PROVIDER_MODEL_MAP = {
    "gemini": GEMINI_MODEL,
    "groq": GROQ_MODEL,
    "ollama": OLLAMA_MODEL,
    "openrouter": OPENROUTER_MODEL,
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

EMBEDDING_CACHE_MODEL = "gemini-embedding-001" if GEMINI_API_KEY else OPENROUTER_EMBEDDING_MODEL


def _append_checkpoint(path: Path | None, row: dict) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(row, ensure_ascii=False) + "\n")


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
    return await cached("embed_text", {"model": EMBEDDING_CACHE_MODEL, "t": text}, _factory)


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    async def _factory():
        async with EMBED_LIMITER:
            return await embed_texts(texts)
    return await cached("embed_texts", {"model": EMBEDDING_CACHE_MODEL, "t": texts}, _factory)


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


def _tokenize_terms(text: str) -> list[str]:
    return re.findall(r"\b\w{2,}\b", text.lower())


def _bm25_scores(query: str, chunks: list[str], *, k1: float = 1.5, b: float = 0.75) -> list[float]:
    tokenized_chunks = [_tokenize_terms(chunk) for chunk in chunks]
    query_terms = _tokenize_terms(query)
    if not query_terms or not tokenized_chunks:
        return [0.0 for _ in chunks]

    doc_count = len(tokenized_chunks)
    avg_len = mean(len(tokens) for tokens in tokenized_chunks) or 1.0
    doc_freq: Counter[str] = Counter()
    term_counts: list[Counter[str]] = []
    for tokens in tokenized_chunks:
        counts = Counter(tokens)
        term_counts.append(counts)
        doc_freq.update(counts.keys())

    scores: list[float] = []
    for tokens, counts in zip(tokenized_chunks, term_counts):
        doc_len = len(tokens) or 1
        score = 0.0
        for term in query_terms:
            tf = counts.get(term, 0)
            if tf <= 0:
                continue
            df = doc_freq.get(term, 0)
            idf = math.log(1 + (doc_count - df + 0.5) / (df + 0.5))
            denom = tf + k1 * (1 - b + b * doc_len / avg_len)
            score += idf * (tf * (k1 + 1)) / denom
        scores.append(score)
    return scores


def _rank_from_scores(scores: list[float], candidate_pool: int) -> list[int]:
    return [
        idx
        for _, idx in sorted(
            ((score, idx) for idx, score in enumerate(scores)),
            key=lambda item: item[0],
            reverse=True,
        )[:candidate_pool]
    ]


def _rrf_fuse(rankings: list[list[int]], candidate_pool: int, *, k: int = 60) -> list[int]:
    fused: dict[int, float] = {}
    for ranking in rankings:
        for rank, idx in enumerate(ranking, start=1):
            fused[idx] = fused.get(idx, 0.0) + 1.0 / (k + rank)
    return [
        idx
        for idx, _ in sorted(fused.items(), key=lambda item: item[1], reverse=True)[:candidate_pool]
    ]


async def _rerank_indices(
    query: str,
    chunks: list[str],
    candidate_indices: list[int],
    top_k: int,
    config: dict | None = None,
) -> list[int]:
    if not candidate_indices:
        return []
    config = config or {}
    candidate_lines = []
    for idx in candidate_indices:
        chunk = chunks[idx].replace("\n", " ")
        candidate_lines.append(f"ID {idx}: {chunk[:900]}")
    prompt = (
        "You are reranking document chunks for quiz generation.\n"
        "Rank chunks by how directly they support the requested quiz topic. "
        "Prefer exact topic evidence over merely related background. "
        "Return only JSON: {\"ranked_ids\":[id1,id2,...]}.\n\n"
        f"Topic/query:\n{query}\n\n"
        "Candidate chunks:\n" + "\n\n".join(candidate_lines)
    )

    async def _inner_call():
        async with LLM_LIMITER:
            return await _call_llm_with_fallback(
                "Return valid JSON only, no markdown.",
                prompt,
                force_provider=config.get("provider"),
                force_model=config.get("model"),
            )

    async def _factory():
        try:
            text, _, _ = await _with_retry(_inner_call)
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.rstrip().endswith("```"):
                    cleaned = cleaned.rstrip()[:-3]
            payload = json.loads(cleaned)
            ranked = payload.get("ranked_ids", []) if isinstance(payload, dict) else payload
            allowed = set(candidate_indices)
            ordered = []
            for value in ranked:
                try:
                    idx = int(value)
                except (TypeError, ValueError):
                    continue
                if idx in allowed and idx not in ordered:
                    ordered.append(idx)
            ordered.extend(idx for idx in candidate_indices if idx not in ordered)
            return ordered[:top_k]
        except Exception as exc:
            print(f"  reranker: provider failure ({type(exc).__name__}); using fused ranking")
            return candidate_indices[:top_k]

    return await cached("rerank", {"prompt": prompt, "top_k": top_k, "config": config}, _factory)


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


async def _retrieve_indices(
    query: str,
    chunks: list[str],
    chunk_vecs: list[list[float]],
    top_k: int,
    *,
    mode: str = "dense",
    reranker: dict | None = None,
) -> list[int]:
    if not chunk_vecs:
        return []
    candidate_pool = min(len(chunk_vecs), max(top_k * 5, 15))
    query_vec = await _embed_text(query)
    dense_scores = [_cosine_similarity(query_vec, vec) for vec in chunk_vecs]
    dense_rank = _rank_from_scores(dense_scores, candidate_pool)

    if mode == "dense":
        return dense_rank[:top_k]

    bm25_rank = _rank_from_scores(_bm25_scores(query, chunks), candidate_pool)
    fused = _rrf_fuse([dense_rank, bm25_rank], candidate_pool)

    if mode == "hybrid":
        return fused[:top_k]
    if mode == "hybrid_rerank":
        return await _rerank_indices(query, chunks, fused, top_k, reranker)

    print(f"  unknown retrieval mode '{mode}', falling back to dense")
    return dense_rank[:top_k]


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


def _topic_confusion_metrics(
    question_embeddings: list[list[float]],
    chunk_vecs: list[list[float]],
    ground_truth: set[int],
    *,
    score_gap_threshold: float = 0.05,
) -> dict:
    if not question_embeddings or not chunk_vecs or not ground_truth:
        return {
            "topic_confusion_rate": 0.0,
            "topic_confusion_count": 0.0,
            "topic_confusion_gap": 0.0,
        }

    confused = 0
    gaps: list[float] = []
    valid_truth = {idx for idx in ground_truth if idx < len(chunk_vecs)}
    if not valid_truth:
        return {
            "topic_confusion_rate": 0.0,
            "topic_confusion_count": 0.0,
            "topic_confusion_gap": 0.0,
        }
    for q_emb in question_embeddings:
        scores = [_cosine_similarity(q_emb, c_emb) for c_emb in chunk_vecs]
        best_idx = max(range(len(scores)), key=lambda idx: scores[idx])
        best_score = scores[best_idx]
        best_truth_score = max(scores[idx] for idx in valid_truth)
        gap = best_score - best_truth_score
        gaps.append(gap)
        if best_idx not in valid_truth and gap >= score_gap_threshold:
            confused += 1

    total = len(question_embeddings)
    return {
        "topic_confusion_rate": confused / total if total else 0.0,
        "topic_confusion_count": float(confused),
        "topic_confusion_gap": mean(gaps) if gaps else 0.0,
    }


def _extract_letter(answer: str) -> str | None:
    match = re.match(r"^\s*([A-Da-d])(?:[\).:\s]|$)", answer or "")
    return match.group(1).upper() if match else None


def _normalize_answer(answer: str, options: list[str]) -> str:
    letter = _extract_letter(answer)
    if letter:
        return letter
    stripped = re.sub(r"^\s*[A-Da-d][\).:\s]+", "", answer or "").strip().lower()
    for idx, option in enumerate(options[:4]):
        option_text = re.sub(r"^\s*[A-Da-d][\).:\s]+", "", str(option)).strip().lower()
        if stripped and stripped == option_text:
            return chr(ord("A") + idx)
    return stripped


async def _verify_answer_correctness(
    questions: list[dict],
    source_chunks: list[str],
    config: dict | None = None,
) -> dict:
    mcq_questions = [
        q for q in questions
        if (q.get("type", "mcq") == "mcq") and isinstance(q.get("options"), list) and q.get("options")
    ]
    if not mcq_questions:
        return {"answer_correctness_machine": 0.0, "answer_mismatch_count": 0.0}

    config = config or {}
    compact_questions = [
        {
            "id": q.get("id", idx + 1),
            "question": q.get("question", ""),
            "options": q.get("options", [])[:4],
        }
        for idx, q in enumerate(mcq_questions)
    ]
    prompt = (
        "You are independently verifying multiple-choice answers from source evidence.\n"
        "For each question, choose the single best option using only the source chunks. "
        "Do not use any existing answer key. "
        "Return only JSON: {\"answers\":[{\"id\":1,\"answer\":\"A\"}, ...]}.\n\n"
        "Source chunks:\n"
        f"{json.dumps(source_chunks, ensure_ascii=False)[:7000]}\n\n"
        "Questions:\n"
        f"{json.dumps(compact_questions, ensure_ascii=False)}"
    )

    async def _inner_call():
        async with LLM_LIMITER:
            return await _call_llm_with_fallback(
                "Return valid JSON only, no markdown.",
                prompt,
                force_provider=config.get("provider"),
                force_model=config.get("model"),
            )

    async def _factory():
        try:
            text, _, _ = await _with_retry(_inner_call)
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.rstrip().endswith("```"):
                    cleaned = cleaned.rstrip()[:-3]
            payload = json.loads(cleaned)
            answers = payload.get("answers", []) if isinstance(payload, dict) else payload
        except Exception as exc:
            print(f"  answer verifier: provider failure ({type(exc).__name__}); marking as unavailable")
            return {"answer_correctness_machine": 0.0, "answer_mismatch_count": float(len(mcq_questions))}

        by_id: dict[str, str] = {}
        for item in answers:
            if not isinstance(item, dict):
                continue
            by_id[str(item.get("id"))] = str(item.get("answer", ""))

        matches = 0
        mismatches = 0
        for q in mcq_questions:
            options = [str(option) for option in q.get("options", [])]
            expected = _normalize_answer(str(q.get("answer", "")), options)
            verified = _normalize_answer(by_id.get(str(q.get("id")), ""), options)
            if expected and verified and expected == verified:
                matches += 1
            else:
                mismatches += 1
        total = matches + mismatches
        return {
            "answer_correctness_machine": matches / total if total else 0.0,
            "answer_mismatch_count": float(mismatches),
        }

    return await cached("answer_verify", {"prompt": prompt, "config": config}, _factory)


async def _run_baseline(
    dataset: dict,
    baseline: dict,
    defaults: dict,
    doc_chunk_cache: dict,
    repeat_idx: int = 0,
    *,
    run_id: str = "",
    checkpoint_path: Path | None = None,
    max_topics: int | None = None,
) -> tuple[dict, list[dict]]:
    topic_metrics = []
    detail_rows = []
    topics_seen = 0
    exam = dataset["exams"][0] if dataset.get("exams") else None
    for doc in dataset["docs"]:
        raw_text = " ".join(doc["chunks"])
        if doc["id"] not in doc_chunk_cache:
            generated_chunks = list(doc["chunks"])
            chunk_vecs = await _embed_texts(generated_chunks)
            doc_chunk_cache[doc["id"]] = (generated_chunks, chunk_vecs)
        generated_chunks, chunk_vecs = doc_chunk_cache[doc["id"]]

        for topic in doc.get("topics", []):
            if max_topics is not None and topics_seen >= max_topics:
                break
            topics_seen += 1
            top_k = int(baseline.get("top_k", defaults.get("top_k", 3)))
            retrieval_mode = baseline.get("retrieval_mode", defaults.get("retrieval_mode", "dense"))
            reranker_config = {
                "provider": baseline.get("reranker_provider", defaults.get("reranker_provider")),
                "model": baseline.get("reranker_model", defaults.get("reranker_model")),
            }
            retrieved_indices = await _retrieve_indices(
                topic["prompt"],
                generated_chunks,
                chunk_vecs,
                top_k,
                mode=retrieval_mode,
                reranker=reranker_config,
            )
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
            confusion = _topic_confusion_metrics(
                question_embeddings,
                chunk_vecs,
                ground_truth,
                score_gap_threshold=float(defaults.get("topic_confusion_gap_threshold", 0.05)),
            )
            verifier_config = {
                "provider": baseline.get("verifier_provider", defaults.get("verifier_provider")),
                "model": baseline.get("verifier_model", defaults.get("verifier_model")),
            }
            answer_check = await _verify_answer_correctness(questions, generation_chunks, verifier_config)

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
                    "topic_confusion_rate": confusion["topic_confusion_rate"],
                    "topic_confusion_count": confusion["topic_confusion_count"],
                    "topic_confusion_gap": confusion["topic_confusion_gap"],
                    "answer_correctness_machine": answer_check["answer_correctness_machine"],
                    "answer_mismatch_count": answer_check["answer_mismatch_count"],
                    "questions_returned": float(len(questions)),
                    "provider": actual_provider,
                    "model": actual_model,
                }
            )
            detail_row = {
                "run_id": run_id,
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
                "topic_confusion_rate": confusion["topic_confusion_rate"],
                "topic_confusion_count": confusion["topic_confusion_count"],
                "topic_confusion_gap": confusion["topic_confusion_gap"],
                "answer_correctness_machine": answer_check["answer_correctness_machine"],
                "answer_mismatch_count": answer_check["answer_mismatch_count"],
                "questions_returned": float(len(questions)),
                "prompt_version": PROMPT_VERSION,
                "retrieval_mode": retrieval_mode,
            }
            detail_rows.append(detail_row)
            _append_checkpoint(checkpoint_path, detail_row)
            print(
                f"  [{baseline['name']}/{doc['id']}/{topic['id']}] "
                f"provider={actual_provider} model={actual_model} q={len(questions)} "
                f"judge={judge:.2f} grounding={grounding:.2f} checkpoint=saved"
            )
        if max_topics is not None and topics_seen >= max_topics:
            break

    if not topic_metrics:
        return {
            "name": baseline["name"],
            **{k: 0.0 for k in METRIC_FIELDS},
            "prompt_version": PROMPT_VERSION,
            "provider": "unknown",
            "model": "unknown",
            "retrieval_mode": baseline.get("retrieval_mode", defaults.get("retrieval_mode", "dense")),
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
        "topic_confusion_rate": mean(item["topic_confusion_rate"] for item in topic_metrics),
        "topic_confusion_count": mean(item["topic_confusion_count"] for item in topic_metrics),
        "topic_confusion_gap": mean(item["topic_confusion_gap"] for item in topic_metrics),
        "answer_correctness_machine": mean(item["answer_correctness_machine"] for item in topic_metrics),
        "answer_mismatch_count": mean(item["answer_mismatch_count"] for item in topic_metrics),
        "questions_returned": mean(item["questions_returned"] for item in topic_metrics),
        "prompt_version": PROMPT_VERSION,
        "provider": provider,
        "model": model,
        "retrieval_mode": baseline.get("retrieval_mode", defaults.get("retrieval_mode", "dense")),
    }, detail_rows


async def run(
    config_path: str,
    name_filter: list[str] | None = None,
    *,
    repeats_override: int | None = None,
    max_topics: int | None = None,
) -> list[dict]:
    config = yaml.safe_load((ROOT / config_path).read_text(encoding="utf-8"))
    defaults = config.get("defaults", {})
    random.seed(int(defaults.get("seed", 42)))
    np.random.seed(int(defaults.get("seed", 42)))

    dataset = json.loads((ROOT / config["datasets"]["path"]).read_text(encoding="utf-8"))
    baselines = config.get("baselines", [])
    if name_filter:
        baselines = [b for b in baselines if b["name"] in name_filter or any(b["name"].startswith(f) for f in name_filter)]

    run_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    checkpoint_path = None
    if config.get("output", {}).get("checkpoint_jsonl", True):
        safe_run_id = run_id.replace(":", "").replace("-", "")
        checkpoint_path = ROOT / "eval" / "results" / "checkpoints" / f"{safe_run_id}_details.jsonl"
        if checkpoint_path.exists():
            checkpoint_path.unlink()
        print(f"Checkpointing per-topic results to {checkpoint_path}")

    doc_chunk_cache: dict = {}
    repeats = repeats_override if repeats_override is not None else int(defaults.get("repeats", 1))
    rows = []
    detail_rows = []
    for baseline in baselines:
        print(f"== Running {baseline['name']} ==")
        baseline_runs = []
        for repeat_idx in range(repeats):
            print(f"  repeat {repeat_idx + 1}/{repeats}")
            summary, details = await _run_baseline(
                dataset,
                baseline,
                defaults,
                doc_chunk_cache,
                repeat_idx,
                run_id=run_id,
                checkpoint_path=checkpoint_path,
                max_topics=max_topics,
            )
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


METRIC_FIELDS = [
    "recall_at_k", "mrr", "semantic_grounding", "bloom_kl", "llm_judge", "diversity",
    "topic_confusion_rate", "topic_confusion_count", "topic_confusion_gap",
    "answer_correctness_machine", "answer_mismatch_count", "questions_returned",
]


def _std(values: list[float]) -> float:
    return stdev(values) if len(values) > 1 else 0.0


def _aggregate_repeats(rows: list[dict]) -> dict:
    if not rows:
        return {}
    out = {
        "name": rows[0]["name"],
        "provider": rows[0].get("provider", "unknown"),
        "model": rows[0].get("model", "unknown"),
        "retrieval_mode": rows[0].get("retrieval_mode", "dense"),
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
        "retrieval_mode": row.get("retrieval_mode", "dense"),
        "repeats": row.get("repeats", 1),
        "recall_at_k": f"{row['recall_at_k']:.4f}",
        "mrr": f"{row['mrr']:.4f}",
        "semantic_grounding": f"{row['semantic_grounding']:.4f}",
        "bloom_kl": f"{row['bloom_kl']:.4f}",
        "llm_judge": f"{row['llm_judge']:.4f}",
        "diversity": f"{row['diversity']:.4f}",
        "topic_confusion_rate": f"{row.get('topic_confusion_rate', 0.0):.4f}",
        "topic_confusion_count": f"{row.get('topic_confusion_count', 0.0):.2f}",
        "topic_confusion_gap": f"{row.get('topic_confusion_gap', 0.0):.4f}",
        "answer_correctness_machine": f"{row.get('answer_correctness_machine', 0.0):.4f}",
        "answer_mismatch_count": f"{row.get('answer_mismatch_count', 0.0):.2f}",
        "questions_returned": f"{row.get('questions_returned', 0.0):.2f}",
        **{
            f"{field}_{suffix}": f"{row.get(f'{field}_{suffix}', row.get(field, 0.0)):.4f}"
            for field in METRIC_FIELDS
            for suffix in ("mean", "std")
        },
        "prompt_version": row["prompt_version"],
    }


CSV_FIELDS = [
    "run_id", "name", "provider", "model", "retrieval_mode", "repeats",
    "recall_at_k", "mrr", "semantic_grounding", "bloom_kl",
    "llm_judge", "diversity", "topic_confusion_rate", "topic_confusion_count",
    "topic_confusion_gap", "answer_correctness_machine", "answer_mismatch_count",
    "questions_returned", "prompt_version",
    *[f"{field}_{suffix}" for field in METRIC_FIELDS for suffix in ("mean", "std")],
]

DETAIL_FIELDS = [
    "run_id", "repeat_idx", "name", "doc_id", "topic_id", "provider", "model", "retrieval_mode",
    "recall_at_k", "mrr", "semantic_grounding", "bloom_kl",
    "llm_judge", "diversity", "topic_confusion_rate", "topic_confusion_count",
    "topic_confusion_gap", "answer_correctness_machine", "answer_mismatch_count",
    "questions_returned", "prompt_version",
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
                    for key in METRIC_FIELDS
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
        if row.get("topic_confusion_rate", 0.0) > 0:
            triggers.append(("Topic confusion", row["topic_confusion_rate"], "Generated questions aligned more strongly with non-target chunks than expected topic chunks."))
        if row.get("answer_correctness_machine", 1.0) < 0.85:
            triggers.append(("Answer mismatch", row["answer_correctness_machine"], "Independent verifier disagreed with one or more generated answer keys."))
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
            else "Improve retrieval/reranking and keep distractor evidence close to the target topic."
            if trigger == "Topic confusion"
            else "Add answer-key verification and manually inspect mismatched options."
            if trigger == "Answer mismatch"
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
    headers = ["baseline", "retrieval", "provider", "model", "repeats", "recall@k", "mrr", "grounding", "confusion", "answer_ok", "judge", "q_returned", "prompt"]
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
                row.get("retrieval_mode", "dense"),
                row.get("provider", "unknown"),
                row.get("model", "unknown"),
                str(row.get("repeats", 1)),
                f"{row['recall_at_k']:.3f}",
                f"{row['mrr']:.3f}",
                f"{row['semantic_grounding']:.3f}",
                f"{row.get('topic_confusion_rate', 0.0):.3f}",
                f"{row.get('answer_correctness_machine', 0.0):.3f}",
                f"{row['llm_judge']:.3f}",
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
    cols = ["name", "retrieval", "provider", "model", "recall@k", "mrr", "ground", "conf", "ans_ok", "judge", "q_ret"]
    data = [
        [
            row["name"],
            row.get("retrieval_mode", "dense"),
            row.get("provider", "unknown"),
            row.get("model", "unknown"),
            f"{row['recall_at_k']:.3f}",
            f"{row['mrr']:.3f}",
            f"{row['semantic_grounding']:.3f}",
            f"{row.get('topic_confusion_rate', 0.0):.3f}",
            f"{row.get('answer_correctness_machine', 0.0):.3f}",
            f"{row['llm_judge']:.3f}",
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
    parser.add_argument("--repeats", type=int, default=None,
                        help="Override repeats from config for quota-safe smoke runs.")
    parser.add_argument("--max-topics", type=int, default=None,
                        help="Stop each baseline repeat after this many topics.")
    args = parser.parse_args()
    asyncio.run(
        run(
            args.config,
            name_filter=args.baselines,
            repeats_override=args.repeats,
            max_topics=args.max_topics,
        )
    )


if __name__ == "__main__":
    main()
