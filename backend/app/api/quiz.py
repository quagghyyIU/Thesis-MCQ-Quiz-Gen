import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.database import get_db, now_iso, row_to_dict
from app.schemas.schemas import QuizSubmitRequest
from app.api.auth import get_current_user

router = APIRouter()

ATTEMPT_JSON_FIELDS = ["answers"]
GEN_JSON_FIELDS = ["questions"]


def _normalize_value(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value or "").strip().lower()
    return cleaned


def _extract_letter(value: str) -> str | None:
    match = re.match(r"^\s*([a-d])(?:[\).:\s]|$)", (value or "").strip(), re.IGNORECASE)
    if not match:
        return None
    return match.group(1).upper()


def _parse_option(option: str) -> tuple[str | None, str]:
    text = (option or "").strip()
    letter = _extract_letter(text)
    normalized_text = _normalize_value(re.sub(r"^\s*[A-Da-d][\).:\s]+", "", text))
    return letter, normalized_text


def _build_option_lookup(options: list[str]) -> tuple[dict[str, str], dict[str, str]]:
    letter_to_text: dict[str, str] = {}
    text_to_letter: dict[str, str] = {}
    for idx, option in enumerate(options):
        parsed_letter, parsed_text = _parse_option(option)
        letter = parsed_letter or chr(ord("A") + idx)
        letter_to_text[letter] = parsed_text
        if parsed_text:
            text_to_letter[parsed_text] = letter
    return letter_to_text, text_to_letter


def _canonicalize_answer(raw_answer: str, options: list[str]) -> str:
    answer = (raw_answer or "").strip()
    if not answer:
        return ""

    letter_to_text, text_to_letter = _build_option_lookup(options)
    answer_letter = _extract_letter(answer)
    if answer_letter and answer_letter in letter_to_text:
        return answer_letter

    normalized_answer = _normalize_value(re.sub(r"^\s*[A-Da-d][\).:\s]+", "", answer))
    if normalized_answer in text_to_letter:
        return text_to_letter[normalized_answer]

    return normalized_answer


def _is_mcq_correct(user_raw: str, correct_raw: str, options: list[str]) -> bool:
    canonical_user = _canonicalize_answer(user_raw, options)
    canonical_correct = _canonicalize_answer(correct_raw, options)
    return canonical_user != "" and canonical_user == canonical_correct


def _time_taken_seconds(time_started: str, time_finished: str) -> int:
    try:
        started = datetime.fromisoformat(time_started.replace("Z", "+00:00"))
        finished = datetime.fromisoformat(time_finished.replace("Z", "+00:00"))
        delta = (finished - started).total_seconds()
        return max(0, int(delta))
    except ValueError:
        return 0


@router.post("/submit")
def submit_quiz(body: QuizSubmitRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        gen_row = db.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (body.generation_id, uid),
        ).fetchone()
        if not gen_row:
            raise HTTPException(404, "Generation not found")

        generation = row_to_dict(gen_row, GEN_JSON_FIELDS)
        questions = generation.get("questions", [])
        mcq_questions = [q for q in questions if q.get("type", "mcq") == "mcq"]
        if not mcq_questions:
            raise HTTPException(400, "Generation does not contain MCQ questions")

        results = []
        correct_count = 0
        normalized_answers: dict[str, str] = {}

        for question in mcq_questions:
            question_id = str(question.get("id"))
            user_answer_raw = body.answers.get(question_id, "")
            correct_answer_raw = question.get("answer", "")
            options = question.get("options", [])

            is_correct = _is_mcq_correct(user_answer_raw, correct_answer_raw, options)

            if is_correct:
                correct_count += 1

            normalized_answers[question_id] = user_answer_raw
            results.append(
                {
                    "q_id": question.get("id"),
                    "correct": is_correct,
                    "user_answer": user_answer_raw,
                    "correct_answer": correct_answer_raw,
                    "bloom_level": question.get("bloom_level", ""),
                }
            )

        total_questions = len(mcq_questions)
        score = round((correct_count / total_questions) * 100, 2) if total_questions else 0
        time_finished = now_iso()
        created_at = now_iso()

        cursor = db.execute(
            """
            INSERT INTO quiz_attempts (
                user_id, generation_id, answers, score, correct_count, total_questions, time_started, time_finished, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                uid,
                body.generation_id,
                json.dumps(normalized_answers),
                score,
                correct_count,
                total_questions,
                body.time_started,
                time_finished,
                created_at,
            ),
        )
        attempt_id = cursor.lastrowid

    return {
        "attempt_id": attempt_id,
        "generation_id": body.generation_id,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "time_taken_seconds": _time_taken_seconds(body.time_started, time_finished),
        "results": results,
    }


@router.get("/attempts")
def list_attempts(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
    return [row_to_dict(row, ATTEMPT_JSON_FIELDS) for row in rows]


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        attempt_row = db.execute(
            "SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ?",
            (attempt_id, uid),
        ).fetchone()
        if not attempt_row:
            raise HTTPException(404, "Attempt not found")
        attempt = row_to_dict(attempt_row, ATTEMPT_JSON_FIELDS)

        gen_row = db.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (attempt["generation_id"], uid),
        ).fetchone()
        if not gen_row:
            raise HTTPException(404, "Generation not found for this attempt")
        generation = row_to_dict(gen_row, GEN_JSON_FIELDS)

    questions = [q for q in generation.get("questions", []) if q.get("type", "mcq") == "mcq"]
    results = []
    for question in questions:
        question_id = str(question.get("id"))
        user_answer = attempt["answers"].get(question_id, "")
        correct_answer = question.get("answer", "")
        options = question.get("options", [])
        is_correct = _is_mcq_correct(user_answer, correct_answer, options)
        results.append(
            {
                "q_id": question.get("id"),
                "correct": is_correct,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "bloom_level": question.get("bloom_level", ""),
                "question": question.get("question", ""),
                "explanation": question.get("explanation", ""),
                "options": options,
            }
        )

    return {
        **attempt,
        "time_taken_seconds": _time_taken_seconds(attempt["time_started"], attempt["time_finished"]),
        "results": results,
    }
