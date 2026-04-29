import json
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.auth import get_current_user
from app.api.documents import ALLOWED_TYPES
from app.config import MAX_UPLOAD_SIZE_MB
from app.database import get_db, now_iso, row_to_dict
from app.services.document_processor import process_document
from app.services.pattern_analyzer import analyze_pattern
from app.services.question_extractor import extract_questions_from_raw

router = APIRouter()

PATTERN_JSON_FIELDS = ["pattern_config", "sample_questions"]


@router.post("/")
async def create_pattern(
    name: str = Form(...),
    description: str = Form(""),
    raw_text: Optional[str] = Form(None),
    user_instructions: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    instructions = (user_instructions or "").strip() or None

    if file is not None and file.filename:
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"Unsupported file type: {file.content_type}. Use PDF, DOCX, or PPTX.")
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_UPLOAD_SIZE_MB:
            raise HTTPException(400, f"File too large ({size_mb:.1f}MB). Max is {MAX_UPLOAD_SIZE_MB}MB.")
        suffix = "." + ALLOWED_TYPES[file.content_type]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        try:
            extracted_text, _, _ = process_document(tmp_path, ALLOWED_TYPES[file.content_type])
        except Exception as e:
            raise HTTPException(500, f"Failed to read file: {str(e)}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        raw_text = extracted_text

    if not raw_text or not raw_text.strip():
        raise HTTPException(400, "Provide either pasted exam text or an uploaded file")

    try:
        questions, _tokens, _provider, _model = await extract_questions_from_raw(
            raw_text,
            user_instructions=instructions,
            user_id=uid,
            call_type="question_extraction",
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to extract questions: {str(e)}")
    if not questions:
        raise HTTPException(400, "Could not extract any questions from the provided source")

    config = analyze_pattern(questions)
    if instructions:
        config["user_instructions"] = instructions

    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO patterns (user_id, name, description, pattern_config, sample_questions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, name, description, json.dumps(config), json.dumps(questions), now_iso()),
        )
        row = db.execute("SELECT * FROM patterns WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.get("/")
def list_patterns(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM patterns WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
    return [row_to_dict(r, PATTERN_JSON_FIELDS) for r in rows]


@router.get("/{pattern_id}")
def get_pattern(pattern_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM patterns WHERE id = ? AND user_id = ?",
            (pattern_id, uid),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Pattern not found")
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.delete("/{pattern_id}")
def delete_pattern(pattern_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM patterns WHERE id = ? AND user_id = ?",
            (pattern_id, uid),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Pattern not found")
        db.execute("DELETE FROM patterns WHERE id = ?", (pattern_id,))
    return {"detail": "Deleted"}
