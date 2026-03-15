"""
Simple accuracy evaluator that checks if generated questions and answers
are grounded in the source material. Uses keyword overlap as a proxy metric.
"""

import re
from collections import Counter


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\b\w{3,}\b", text.lower()))


def _overlap_score(text_a: str, text_b: str) -> float:
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    return len(intersection) / min(len(tokens_a), len(tokens_b))


def evaluate_generation(questions: list[dict], source_text: str) -> dict:
    if not questions:
        return {"overall_score": 0, "details": [], "summary": "No questions to evaluate"}

    source_tokens = _tokenize(source_text)
    details = []
    total_score = 0.0

    for q in questions:
        q_text = q.get("question", "")
        a_text = q.get("answer", "")
        explanation = q.get("explanation", "")

        combined = f"{q_text} {a_text} {explanation}"
        combined_tokens = _tokenize(combined)

        if not combined_tokens:
            details.append({"question_id": q.get("id", 0), "grounding_score": 0, "status": "ungrounded"})
            continue

        overlap = len(combined_tokens & source_tokens) / len(combined_tokens)
        total_score += overlap

        status = "well_grounded" if overlap > 0.5 else "partially_grounded" if overlap > 0.25 else "poorly_grounded"
        details.append({
            "question_id": q.get("id", 0),
            "grounding_score": round(overlap, 3),
            "status": status,
        })

    avg_score = total_score / len(questions) if questions else 0
    well_grounded = sum(1 for d in details if d["status"] == "well_grounded")

    return {
        "overall_score": round(avg_score, 3),
        "well_grounded_count": well_grounded,
        "total_questions": len(questions),
        "well_grounded_pct": round(well_grounded / len(questions) * 100, 1) if questions else 0,
        "details": details,
        "summary": f"{well_grounded}/{len(questions)} questions well-grounded in source material ({round(avg_score * 100, 1)}% avg overlap)",
    }
