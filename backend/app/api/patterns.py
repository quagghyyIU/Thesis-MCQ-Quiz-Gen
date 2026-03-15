import json
from fastapi import APIRouter, HTTPException

from app.database import get_db, now_iso, row_to_dict
from app.schemas.schemas import PatternCreate
from app.services.pattern_analyzer import analyze_pattern
from app.services.question_extractor import extract_questions_from_raw

router = APIRouter()

PATTERN_JSON_FIELDS = ["pattern_config", "sample_questions"]


@router.post("/")
async def create_pattern(body: PatternCreate):
    questions = body.sample_questions

    if body.raw_text and body.raw_text.strip():
        try:
            questions, tokens, provider = await extract_questions_from_raw(body.raw_text)
        except Exception as e:
            raise HTTPException(500, f"Failed to extract questions: {str(e)}")
        if not questions:
            raise HTTPException(400, "Could not extract any questions from the provided text")

        with get_db() as db:
            db.execute(
                "INSERT INTO api_calls (call_type, provider, token_usage, created_at) VALUES (?, ?, ?, ?)",
                ("question_extraction", provider, tokens, now_iso()),
            )

    if not questions:
        raise HTTPException(400, "Provide sample questions or paste raw exam text")

    config = analyze_pattern(questions)
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO patterns (name, description, pattern_config, sample_questions, created_at) VALUES (?, ?, ?, ?, ?)",
            (body.name, body.description, json.dumps(config), json.dumps(questions), now_iso()),
        )
        row = db.execute("SELECT * FROM patterns WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.get("/")
def list_patterns():
    with get_db() as db:
        rows = db.execute("SELECT * FROM patterns ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r, PATTERN_JSON_FIELDS) for r in rows]


@router.get("/{pattern_id}")
def get_pattern(pattern_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM patterns WHERE id = ?", (pattern_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Pattern not found")
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.delete("/{pattern_id}")
def delete_pattern(pattern_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM patterns WHERE id = ?", (pattern_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Pattern not found")
        db.execute("DELETE FROM patterns WHERE id = ?", (pattern_id,))
    return {"detail": "Deleted"}
