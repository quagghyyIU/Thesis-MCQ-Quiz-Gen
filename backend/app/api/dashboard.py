from collections import defaultdict
import re

from fastapi import APIRouter, Depends

from app.api.auth import get_current_user
from app.api.quiz import _is_mcq_correct, _time_taken_seconds
from app.database import get_db, row_to_dict

router = APIRouter()

ATTEMPT_JSON_FIELDS = ["answers"]
GEN_JSON_FIELDS = ["questions"]


def _compact_topic_labels(questions: list[dict], topic_focus: str = "") -> list[dict]:
    if topic_focus:
        for question in questions:
            question["topic"] = topic_focus[:80]
        return questions

    max_topics = 3 if len(questions) <= 10 else 4
    topic_order: list[str] = []
    for question in questions:
        topic = (question.get("topic") or "General").strip() or "General"
        question["topic"] = topic
        if topic not in topic_order:
            topic_order.append(topic)

    if len(topic_order) <= max_topics:
        return questions

    canonical = topic_order[:max_topics]
    canonical_tokens = {
        topic: set(re.findall(r"\b\w{3,}\b", topic.lower()))
        for topic in canonical
    }
    for question in questions:
        topic = question.get("topic") or "General"
        if topic in canonical:
            continue
        tokens = set(re.findall(r"\b\w{3,}\b", topic.lower()))
        question["topic"] = max(canonical, key=lambda candidate: len(tokens & canonical_tokens[candidate]))
    return questions


@router.get("/summary")
def dashboard_summary(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()

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
def dashboard_trend(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            """
            SELECT qa.*, g.document_id, d.filename AS stored_document_name,
                   COALESCE(NULLIF(d.original_filename, ''), d.filename) AS document_name
            , g.title AS generation_title
            FROM quiz_attempts qa
            LEFT JOIN generations g ON g.id = qa.generation_id
            LEFT JOIN documents d ON d.id = g.document_id
            WHERE qa.user_id = ?
            ORDER BY qa.created_at ASC
            """,
            (uid,),
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
def dashboard_bloom_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})

    with get_db() as db:
        attempt_rows = db.execute(
            "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
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


@router.get("/topic-stats")
def dashboard_topic_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    stats: dict[str, dict] = {}

    with get_db() as db:
        rows = db.execute(
            """
            SELECT qa.*, g.questions, g.config_snapshot, g.title AS generation_title, g.document_id, g.created_at AS generation_created_at
            FROM quiz_attempts qa
            LEFT JOIN generations g ON g.id = qa.generation_id
            WHERE qa.user_id = ?
            ORDER BY qa.created_at ASC
            """,
            (uid,),
        ).fetchall()

    for row in rows:
        attempt = row_to_dict(row, ["answers", "questions", "config_snapshot"])
        answers = attempt.get("answers") or {}
        config_snapshot = attempt.get("config_snapshot") or {}
        questions = _compact_topic_labels(
            attempt.get("questions") or [],
            str(config_snapshot.get("topic_focus") or "").strip(),
        )

        for question in questions:
            if question.get("type", "mcq") != "mcq":
                continue
            topic = (question.get("topic") or "General").strip() or "General"
            entry = stats.setdefault(
                topic,
                {
                    "topic": topic,
                    "correct": 0,
                    "total": 0,
                    "document_id": attempt.get("document_id"),
                    "generation_id": attempt.get("generation_id"),
                    "generation_title": attempt.get("generation_title") or "",
                    "latest_attempt_at": attempt.get("created_at") or "",
                    "recommended_questions": 6,
                },
            )

            question_id = str(question.get("id"))
            user_answer = answers.get(question_id, "")
            correct_answer = question.get("answer", "")
            options = question.get("options", [])
            entry["total"] += 1
            if _is_mcq_correct(user_answer, correct_answer, options):
                entry["correct"] += 1

            if (attempt.get("created_at") or "") >= (entry.get("latest_attempt_at") or ""):
                entry["document_id"] = attempt.get("document_id")
                entry["generation_id"] = attempt.get("generation_id")
                entry["generation_title"] = attempt.get("generation_title") or ""
                entry["latest_attempt_at"] = attempt.get("created_at") or ""

    rows_out = []
    for entry in stats.values():
        total = int(entry["total"])
        correct = int(entry["correct"])
        accuracy = round((correct / total) * 100, 2) if total else 0
        rows_out.append({
            **entry,
            "accuracy": accuracy,
            "weak": total >= 1 and accuracy < 70,
        })

    return sorted(rows_out, key=lambda item: (not item["weak"], -item["total"], item["topic"]))
