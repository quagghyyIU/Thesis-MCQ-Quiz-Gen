import json
from fastapi import APIRouter, HTTPException, Depends

from app.database import get_db, now_iso, row_to_dict
from app.errors import AppError
from app.models.models import JobStatus
from app.schemas.schemas import GenerateRequest, GenerationUpdate
from app.services.question_generator import build_config_snapshot, generate_questions
from app.services.accuracy_evaluator import evaluate_generation
from app.services.rate_limit import check_user_rate
from app.api.auth import get_current_user

router = APIRouter()

GEN_JSON_FIELDS = ["questions", "config_snapshot"]
PATTERN_JSON_FIELDS = ["pattern_config", "sample_questions"]
DOC_JSON_FIELDS = ["processed_chunks"]


def _load_pattern(db, pattern_id: int, user_id: int):
    row = db.execute(
        "SELECT * FROM patterns WHERE id = ? AND user_id = ?",
        (pattern_id, user_id),
    ).fetchone()
    if not row:
        return None
    return row_to_dict(row, PATTERN_JSON_FIELDS)


@router.post("/")
async def create_generation(body: GenerateRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    check_user_rate(uid)
    with get_db() as db:
        doc_row = db.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (body.document_id, uid),
        ).fetchone()
        if not doc_row:
            raise HTTPException(404, "Document not found")
        doc = row_to_dict(doc_row, DOC_JSON_FIELDS)

        pattern = None
        if body.pattern_id:
            pattern = _load_pattern(db, body.pattern_id, uid)
            if not pattern:
                raise HTTPException(404, "Pattern not found")

        language = body.language or doc["language"]

        config_snapshot = build_config_snapshot(
            question_types=body.question_types,
            num_questions=body.num_questions,
            language=language,
            pattern_id=body.pattern_id,
            difficulty_distribution=body.difficulty_distribution,
        )
        cursor = db.execute(
            "INSERT INTO generations (user_id, document_id, pattern_id, status, config_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, doc["id"], body.pattern_id, JobStatus.PROCESSING, json.dumps(config_snapshot), now_iso()),
        )
        gen_id = cursor.lastrowid

    try:
        questions, prompt_used, tokens, provider, model, prompt_version = await generate_questions(
            document_id=doc["id"],
            chunks=doc["processed_chunks"],
            num_questions=body.num_questions,
            question_types=body.question_types,
            language=language,
            pattern=pattern,
            difficulty_distribution=body.difficulty_distribution,
            user_id=uid,
            call_type="question_generation",
        )
        config_snapshot["llm_model_used"] = model
        with get_db() as db:
            db.execute(
                "UPDATE generations SET questions = ?, prompt_used = ?, token_usage = ?, provider = ?, prompt_version = ?, config_snapshot = ?, status = ? WHERE id = ?",
                (
                    json.dumps(questions),
                    prompt_used,
                    tokens,
                    provider,
                    prompt_version,
                    json.dumps(config_snapshot),
                    JobStatus.COMPLETED,
                    gen_id,
                ),
            )
    except AppError:
        with get_db() as db:
            db.execute("UPDATE generations SET status = ? WHERE id = ?", (JobStatus.FAILED, gen_id))
        raise
    except Exception as e:
        with get_db() as db:
            db.execute("UPDATE generations SET status = ? WHERE id = ?", (JobStatus.FAILED, gen_id))
        raise HTTPException(500, f"Generation failed: {str(e)}")

    with get_db() as db:
        row = db.execute("SELECT * FROM generations WHERE id = ?", (gen_id,)).fetchone()
    return row_to_dict(row, GEN_JSON_FIELDS)


@router.get("/")
def list_generations(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
    return [row_to_dict(r, GEN_JSON_FIELDS) for r in rows]


@router.get("/{gen_id}")
def get_generation(gen_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (gen_id, uid),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Generation not found")
    return row_to_dict(row, GEN_JSON_FIELDS)


@router.patch("/{gen_id}")
def update_generation(gen_id: int, body: GenerationUpdate, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    title = body.title.strip()
    if len(title) > 120:
        raise HTTPException(400, "Title must be 120 characters or fewer")

    with get_db() as db:
        row = db.execute(
            "SELECT id FROM generations WHERE id = ? AND user_id = ?",
            (gen_id, uid),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Generation not found")
        db.execute(
            "UPDATE generations SET title = ? WHERE id = ? AND user_id = ?",
            (title, gen_id, uid),
        )
        updated = db.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (gen_id, uid),
        ).fetchone()
    return row_to_dict(updated, GEN_JSON_FIELDS)


@router.get("/{gen_id}/evaluate")
def evaluate_gen(gen_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        gen_row = db.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (gen_id, uid),
        ).fetchone()
        if not gen_row:
            raise HTTPException(404, "Generation not found")
        gen = row_to_dict(gen_row, GEN_JSON_FIELDS)

        doc_row = db.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (gen["document_id"], uid),
        ).fetchone()
        if not doc_row:
            raise HTTPException(404, "Source document not found")
        doc = row_to_dict(doc_row, DOC_JSON_FIELDS)

    return evaluate_generation(gen["questions"], doc["raw_text"], user_id=uid)
