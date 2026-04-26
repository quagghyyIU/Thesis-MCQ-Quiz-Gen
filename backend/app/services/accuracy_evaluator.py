import asyncio
import re

import numpy as np

from app.services.embedder import embed_texts


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\b\w{3,}\b", text.lower()))


def _overlap_score(text_a: str, text_b: str) -> float:
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    return len(intersection) / min(len(tokens_a), len(tokens_b))


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    return float(np.dot(a, b) / denom)


async def _evaluate_generation_async(
    questions: list[dict],
    source_text: str,
    *,
    user_id: int | None = None,
) -> dict:
    if not questions:
        return {"overall_score": 0, "details": [], "summary": "No questions to evaluate"}

    source_tokens = _tokenize(source_text)
    details = []
    total_semantic = 0.0
    total_keyword = 0.0

    question_payloads = []
    for question in questions:
        question_payloads.append(
            f"{question.get('question', '')} {question.get('answer', '')} {question.get('explanation', '')}".strip()
        )

    source_embeddings = await embed_texts(
        [source_text], user_id=user_id, call_type="accuracy_eval", db_log=True
    )
    question_embeddings = await embed_texts(
        question_payloads, user_id=user_id, call_type="accuracy_eval", db_log=True
    )
    source_embedding = source_embeddings[0] if source_embeddings else []

    for index, question in enumerate(questions):
        combined = question_payloads[index]
        combined_tokens = _tokenize(combined)

        if not combined_tokens:
            details.append(
                {
                    "question_id": question.get("id", 0),
                    "grounding_score": 0,
                    "keyword_overlap_score": 0,
                    "status": "ungrounded",
                }
            )
            continue

        keyword_overlap = len(combined_tokens & source_tokens) / len(combined_tokens)
        total_keyword += keyword_overlap

        semantic_score = 0.0
        if source_embedding and index < len(question_embeddings):
            semantic_score = max(0.0, min(1.0, (_cosine_similarity(question_embeddings[index], source_embedding) + 1) / 2))
        total_semantic += semantic_score

        status = (
            "well_grounded"
            if semantic_score > 0.7
            else "partially_grounded"
            if semantic_score > 0.45
            else "poorly_grounded"
        )
        details.append(
            {
                "question_id": question.get("id", 0),
                "grounding_score": round(semantic_score, 3),
                "keyword_overlap_score": round(keyword_overlap, 3),
                "status": status,
            }
        )

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
    }


def evaluate_generation(questions: list[dict], source_text: str, user_id: int | None = None) -> dict:
    try:
        return asyncio.run(_evaluate_generation_async(questions, source_text, user_id=user_id))
    except Exception:
        if not questions:
            return {"overall_score": 0, "details": [], "summary": "No questions to evaluate"}

        source_tokens = _tokenize(source_text)
        details = []
        total_score = 0.0
        for question in questions:
            combined = f"{question.get('question', '')} {question.get('answer', '')} {question.get('explanation', '')}"
            combined_tokens = _tokenize(combined)
            if not combined_tokens:
                details.append({"question_id": question.get("id", 0), "grounding_score": 0, "status": "ungrounded"})
                continue
            overlap = len(combined_tokens & source_tokens) / len(combined_tokens)
            total_score += overlap
            status = "well_grounded" if overlap > 0.5 else "partially_grounded" if overlap > 0.25 else "poorly_grounded"
            details.append({"question_id": question.get("id", 0), "grounding_score": round(overlap, 3), "status": status})

        avg_score = total_score / len(questions) if questions else 0
        return {
            "method": "keyword_overlap_fallback",
            "overall_score": round(avg_score, 3),
            "keyword_baseline_score": round(avg_score, 3),
            "well_grounded_count": sum(1 for detail in details if detail["status"] == "well_grounded"),
            "total_questions": len(questions),
            "well_grounded_pct": round(sum(1 for detail in details if detail["status"] == "well_grounded") / len(questions) * 100, 1),
            "details": details,
            "summary": f"Fallback keyword overlap used ({round(avg_score * 100, 1)}% avg overlap)",
        }
