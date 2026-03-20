import json
from fastapi import APIRouter, HTTPException

from app.database import get_db, now_iso, row_to_dict
from app.models.models import JobStatus
from app.schemas.schemas import GenerateRequest
from app.services.question_generator import generate_questions
from app.services.accuracy_evaluator import evaluate_generation

router = APIRouter()

GEN_JSON_FIELDS = ["questions"]
PATTERN_JSON_FIELDS = ["pattern_config", "sample_questions"]
DOC_JSON_FIELDS = ["processed_chunks"]


def _load_pattern(db, pattern_id):
    row = db.execute("SELECT * FROM patterns WHERE id = ?", (pattern_id,)).fetchone()
    if not row:
        return None
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.post("/")
async def create_generation(body: GenerateRequest):
    with get_db() as db:
        doc_row = db.execute("SELECT * FROM documents WHERE id = ?", (body.document_id,)).fetchone()
        if not doc_row:
            raise HTTPException(404, "Document not found")
        doc = row_to_dict(doc_row, DOC_JSON_FIELDS)

        pattern = None
        if body.pattern_id:
            pattern = _load_pattern(db, body.pattern_id)
            if not pattern:
                raise HTTPException(404, "Pattern not found")

        language = body.language or doc["language"]

        cursor = db.execute(
            "INSERT INTO generations (document_id, pattern_id, status, created_at) VALUES (?, ?, ?, ?)",
            (doc["id"], body.pattern_id, JobStatus.PROCESSING, now_iso()),
        )
        gen_id = cursor.lastrowid

    try:
        questions, prompt_used, tokens, provider = await generate_questions(
            document_id=doc["id"],
            chunks=doc["processed_chunks"],
            num_questions=body.num_questions,
            question_types=body.question_types,
            language=language,
            pattern=pattern,
            difficulty_distribution=body.difficulty_distribution,
        )
        with get_db() as db:
            db.execute(
                "UPDATE generations SET questions = ?, prompt_used = ?, token_usage = ?, provider = ?, status = ? WHERE id = ?",
                (json.dumps(questions), prompt_used, tokens, provider, JobStatus.COMPLETED, gen_id),
            )
            db.execute(
                "INSERT INTO api_calls (call_type, provider, token_usage, created_at) VALUES (?, ?, ?, ?)",
                ("question_generation", provider, tokens, now_iso()),
            )
    except Exception as e:
        with get_db() as db:
            db.execute("UPDATE generations SET status = ? WHERE id = ?", (JobStatus.FAILED, gen_id))
        raise HTTPException(500, f"Generation failed: {str(e)}")

    with get_db() as db:
        row = db.execute("SELECT * FROM generations WHERE id = ?", (gen_id,)).fetchone()
    return row_to_dict(row, GEN_JSON_FIELDS)


@router.get("/")
def list_generations():
    with get_db() as db:
        rows = db.execute("SELECT * FROM generations ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r, GEN_JSON_FIELDS) for r in rows]


@router.get("/{gen_id}")
def get_generation(gen_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM generations WHERE id = ?", (gen_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Generation not found")
    return row_to_dict(row, GEN_JSON_FIELDS)


@router.get("/{gen_id}/evaluate")
def evaluate_gen(gen_id: int):
    with get_db() as db:
        gen_row = db.execute("SELECT * FROM generations WHERE id = ?", (gen_id,)).fetchone()
        if not gen_row:
            raise HTTPException(404, "Generation not found")
        gen = row_to_dict(gen_row, GEN_JSON_FIELDS)

        doc_row = db.execute("SELECT * FROM documents WHERE id = ?", (gen["document_id"],)).fetchone()
        if not doc_row:
            raise HTTPException(404, "Source document not found")
        doc = row_to_dict(doc_row, DOC_JSON_FIELDS)

    return evaluate_generation(gen["questions"], doc["raw_text"])
