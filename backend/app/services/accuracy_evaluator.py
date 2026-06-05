import asyncio
import re

import numpy as np

from app.services.embedder import embed_texts


_METRIC_NOTE = (
    "Hybrid metric: semantic cosine similarity against the best matching source chunk "
    "(primary) plus keyword overlap baseline. It highlights grounding risk but does "
    "not replace lecturer review."
)


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\b\w{3,}\b", text.lower()))


def _overlap_score(text_a: str, text_b: str) -> float:
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    return len(intersection) / min(len(tokens_a), len(tokens_b))


def _keyword_overlap_against_units(tokens: set[str], source_units: list[str]) -> tuple[float, set[str], set[str], int]:
    best_score = 0.0
    best_terms: set[str] = set()
    best_unit_index = 0
    if not tokens:
        return 0.0, set(), set(), 0

    for idx, unit in enumerate(source_units):
        unit_tokens = _tokenize(unit)
        if not unit_tokens:
            continue
        matched = tokens & unit_tokens
        score = len(matched) / len(tokens)
        if score > best_score:
            best_score = score
            best_terms = matched
            best_unit_index = idx

    return best_score, best_terms, tokens - best_terms, best_unit_index


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    return float(np.dot(a, b) / denom)


async def _evaluate_generation_async(
    questions: list[dict],
    source_text: str,
    *,
    source_chunks: list[str] | None = None,
    user_id: int | None = None,
) -> dict:
    if not questions:
        return {
            "overall_score": 0,
            "details": [],
            "summary": "No questions to evaluate",
            "metric_note": _METRIC_NOTE,
        }

    source_units = [chunk for chunk in (source_chunks or []) if chunk.strip()] or [source_text]
    details = []
    total_semantic = 0.0
    total_keyword = 0.0

    question_payloads = [
        f"{q.get('question', '')} {q.get('answer', '')} {q.get('explanation', '')}".strip()
        for q in questions
    ]

    source_embeddings = await embed_texts(source_units, user_id=user_id, call_type="accuracy_eval", db_log=True)
    question_embeddings = await embed_texts(
        question_payloads, user_id=user_id, call_type="accuracy_eval", db_log=True
    )

    for index, question in enumerate(questions):
        combined = question_payloads[index]
        combined_tokens = _tokenize(combined)

        if not combined_tokens:
            details.append({
                "question_id": question.get("id", 0),
                "grounding_score": 0,
                "keyword_overlap_score": 0,
                "status": "ungrounded",
                "matched_terms": [],
                "missing_terms": [],
                "evidence": "No usable content tokens found in generated question.",
            })
            continue

        keyword_overlap, matched_set, missing_set, best_keyword_idx = _keyword_overlap_against_units(
            combined_tokens,
            source_units,
        )
        matched_terms = sorted(matched_set)
        missing_terms = sorted(missing_set)
        total_keyword += keyword_overlap

        semantic_score = 0.0
        best_semantic_idx = 0
        if source_embeddings and index < len(question_embeddings):
            scores = [
                max(0.0, min(1.0, (_cosine_similarity(question_embeddings[index], source_embedding) + 1) / 2))
                for source_embedding in source_embeddings
            ]
            best_semantic_idx = max(range(len(scores)), key=lambda idx: scores[idx])
            semantic_score = scores[best_semantic_idx]
        total_semantic += semantic_score

        status = (
            "well_grounded"
            if semantic_score >= 0.7 or (semantic_score >= 0.62 and keyword_overlap >= 0.7)
            else "partially_grounded"
            if semantic_score > 0.45
            else "poorly_grounded"
        )
        details.append({
            "question_id": question.get("id", 0),
            "grounding_score": round(semantic_score, 3),
            "keyword_overlap_score": round(keyword_overlap, 3),
            "status": status,
            "matched_terms": matched_terms[:12],
            "missing_terms": missing_terms[:8],
            "evidence": (
                f"Matched {len(matched_terms)} of {len(combined_tokens)} generated content terms "
                f"against source chunk {best_keyword_idx}; best semantic chunk was {best_semantic_idx}."
            ),
        })

    avg_semantic = total_semantic / len(questions) if questions else 0
    avg_keyword = total_keyword / len(questions) if questions else 0
    well_grounded = sum(1 for detail in details if detail["status"] == "well_grounded")

    return {
        "method": "semantic_cosine",
        "overall_score": round(avg_semantic, 3),
        "keyword_baseline_score": round(avg_keyword, 3),
        "well_grounded_count": well_grounded,
        "total_questions": len(questions),
        "well_grounded_pct": round(well_grounded / len(questions) * 100, 1) if questions else 0,
        "details": details,
        "summary": (
            f"{well_grounded}/{len(questions)} questions well-grounded "
            f"(semantic avg={round(avg_semantic * 100, 1)}%, keyword baseline={round(avg_keyword * 100, 1)}%)"
        ),
        "metric_note": _METRIC_NOTE,
    }


def evaluate_generation(
    questions: list[dict],
    source_text: str,
    source_chunks: list[str] | None = None,
    user_id: int | None = None,
) -> dict:
    try:
        return asyncio.run(
            _evaluate_generation_async(
                questions,
                source_text,
                source_chunks=source_chunks,
                user_id=user_id,
            )
        )
    except Exception:
        if not questions:
            return {
                "overall_score": 0,
                "details": [],
                "summary": "No questions to evaluate",
                "metric_note": _METRIC_NOTE,
            }

        source_units = [chunk for chunk in (source_chunks or []) if chunk.strip()] or [source_text]
        details = []
        total_score = 0.0
        for question in questions:
            combined = f"{question.get('question', '')} {question.get('answer', '')} {question.get('explanation', '')}"
            combined_tokens = _tokenize(combined)
            if not combined_tokens:
                details.append({
                    "question_id": question.get("id", 0),
                    "grounding_score": 0,
                    "status": "ungrounded",
                    "matched_terms": [],
                    "missing_terms": [],
                    "evidence": "No usable content tokens found in generated question.",
                })
                continue
            overlap, matched_set, missing_set, best_keyword_idx = _keyword_overlap_against_units(
                combined_tokens,
                source_units,
            )
            matched_terms = sorted(matched_set)
            missing_terms = sorted(missing_set)
            total_score += overlap
            status = "well_grounded" if overlap > 0.5 else "partially_grounded" if overlap > 0.25 else "poorly_grounded"
            details.append({
                "question_id": question.get("id", 0),
                "grounding_score": round(overlap, 3),
                "keyword_overlap_score": round(overlap, 3),
                "status": status,
                "matched_terms": matched_terms[:12],
                "missing_terms": missing_terms[:8],
                "evidence": (
                    f"Matched {len(matched_terms)} of {len(combined_tokens)} generated content terms "
                    f"against source chunk {best_keyword_idx}."
                ),
            })

        well_grounded = sum(1 for detail in details if detail["status"] == "well_grounded")
        avg_score = total_score / len(questions) if questions else 0
        return {
            "method": "keyword_overlap_fallback",
            "overall_score": round(avg_score, 3),
            "keyword_baseline_score": round(avg_score, 3),
            "well_grounded_count": well_grounded,
            "total_questions": len(questions),
            "well_grounded_pct": round(well_grounded / len(questions) * 100, 1),
            "details": details,
            "summary": f"Fallback keyword overlap used ({round(avg_score * 100, 1)}% avg overlap)",
            "metric_note": _METRIC_NOTE,
        }
