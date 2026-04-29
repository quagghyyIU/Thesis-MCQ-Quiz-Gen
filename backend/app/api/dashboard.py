from collections import defaultdict

from fastapi import APIRouter

from app.api.quiz import _is_mcq_correct, _time_taken_seconds
from app.database import get_db, row_to_dict

router = APIRouter()

ATTEMPT_JSON_FIELDS = ["answers"]
GEN_JSON_FIELDS = ["questions"]


@router.get("/summary")
def dashboard_summary():
    with get_db() as db:
        rows = db.execute("SELECT * FROM quiz_attempts ORDER BY created_at DESC").fetchall()

    attempts = [row_to_dict(row, ATTEMPT_JSON_FIELDS) for row in rows]
    total_attempts = len(attempts)
    total_questions = sum(int(a.get("total_questions") or 0) for a in attempts)
    total_correct = sum(int(a.get("correct_count") or 0) for a in attempts)
    scores = [float(a.get("score") or 0) for a in attempts]

    return {
        "total_attempts": total_attempts,
        "avg_score": round(sum(scores) / total_attempts, 2) if total_attempts else 0,
        "best_score": round(max(scores), 2) if scores else 0,
        "total_questions_answered": total_questions,
        "total_correct": total_correct,
        "accuracy": round((total_correct / total_questions) * 100, 2) if total_questions else 0,
    }


@router.get("/trend")
def dashboard_trend():
    with get_db() as db:
        rows = db.execute(
            """
            SELECT qa.*, g.document_id, d.filename AS document_name
            , g.title AS generation_title
            FROM quiz_attempts qa
            LEFT JOIN generations g ON g.id = qa.generation_id
            LEFT JOIN documents d ON d.id = g.document_id
            ORDER BY qa.created_at ASC
            """
        ).fetchall()

    trend = []
    for row in rows:
        attempt = row_to_dict(row, ATTEMPT_JSON_FIELDS)
        trend.append({
            "attempt_id": attempt["id"],
            "generation_id": attempt["generation_id"],
            "date": attempt["created_at"],
            "score": attempt["score"],
            "correct_count": attempt.get("correct_count", 0),
            "total_questions": attempt.get("total_questions", 0),
            "time_taken_seconds": _time_taken_seconds(attempt["time_started"], attempt["time_finished"]),
            "document_name": attempt.get("document_name") or "Unknown document",
            "generation_title": attempt.get("generation_title") or "",
            "confidence_pct": attempt["score"],
        })
    return trend


@router.get("/bloom-stats")
def dashboard_bloom_stats():
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})

    with get_db() as db:
        attempt_rows = db.execute("SELECT * FROM quiz_attempts ORDER BY created_at DESC").fetchall()
        attempts = [row_to_dict(row, ATTEMPT_JSON_FIELDS) for row in attempt_rows]

        generation_cache = {}
        for attempt in attempts:
            gen_id = attempt["generation_id"]
            if gen_id not in generation_cache:
                gen_row = db.execute("SELECT * FROM generations WHERE id = ?", (gen_id,)).fetchone()
                generation_cache[gen_id] = row_to_dict(gen_row, GEN_JSON_FIELDS) if gen_row else None

            generation = generation_cache[gen_id]
            if not generation:
                continue

            for question in generation.get("questions", []):
                if question.get("type", "mcq") != "mcq":
                    continue
                question_id = str(question.get("id"))
                bloom_level = question.get("bloom_level") or "unknown"
                user_answer = attempt["answers"].get(question_id, "")
                correct_answer = question.get("answer", "")
                options = question.get("options", [])

                stats[bloom_level]["total"] += 1
                if _is_mcq_correct(user_answer, correct_answer, options):
                    stats[bloom_level]["correct"] += 1

    return {
        level: {
            **values,
            "accuracy": round((values["correct"] / values["total"]) * 100, 2) if values["total"] else 0,
        }
        for level, values in stats.items()
    }
