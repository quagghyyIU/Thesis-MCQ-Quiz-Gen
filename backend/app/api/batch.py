import json
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends

from app.database import get_db, now_iso, row_to_dict
from app.models.models import JobStatus
from app.schemas.schemas import BatchJobCreate
from app.services.question_generator import build_config_snapshot, generate_questions
from app.services.rate_limit import check_user_rate
from app.api.auth import get_current_user

router = APIRouter()

BATCH_JSON_FIELDS = ["document_ids", "results"]
DOC_JSON_FIELDS = ["processed_chunks"]
PATTERN_JSON_FIELDS = ["pattern_config", "sample_questions"]


def _run_batch_sync(
    batch_id: int,
    user_id: int,
    doc_ids: list[int],
    pattern_id: int | None,
    num_questions: int,
    question_types: list[str],
):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_run_batch(batch_id, user_id, doc_ids, pattern_id, num_questions, question_types))
    finally:
        loop.close()


async def _run_batch(
    batch_id: int,
    user_id: int,
    doc_ids: list[int],
    pattern_id: int | None,
    num_questions: int,
    question_types: list[str],
):
    pattern = None
    if pattern_id:
        with get_db() as db:
            p_row = db.execute(
                "SELECT * FROM patterns WHERE id = ? AND user_id = ?",
                (pattern_id, user_id),
            ).fetchone()
            if p_row:
                pattern = row_to_dict(p_row, PATTERN_JSON_FIELDS)

    for i, doc_id in enumerate(doc_ids):
        with get_db() as db:
            doc_row = db.execute(
                "SELECT * FROM documents WHERE id = ? AND user_id = ?",
                (doc_id, user_id),
            ).fetchone()
            if not doc_row:
                continue
            doc = row_to_dict(doc_row, DOC_JSON_FIELDS)

            config_snapshot = build_config_snapshot(
                question_types=question_types,
                num_questions=num_questions,
                language=doc["language"],
                pattern_id=pattern_id,
                difficulty_distribution=None,
            )
            cursor = db.execute(
                "INSERT INTO generations (user_id, document_id, pattern_id, status, config_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, doc_id, pattern_id, JobStatus.PROCESSING, json.dumps(config_snapshot), now_iso()),
            )
            gen_id = cursor.lastrowid

        gen_status = JobStatus.FAILED
        try:
            questions, prompt_used, tokens, provider, model, prompt_version = await generate_questions(
                document_id=doc_id,
                chunks=doc["processed_chunks"],
                num_questions=num_questions,
                question_types=question_types,
                language=doc["language"],
                pattern=pattern,
                user_id=user_id,
                call_type="question_generation",
            )
            config_snapshot["llm_model_used"] = model
            gen_status = JobStatus.COMPLETED
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
                        gen_status,
                        gen_id,
                    ),
                )
        except Exception:
            with get_db() as db:
                db.execute("UPDATE generations SET status = ? WHERE id = ?", (JobStatus.FAILED, gen_id))

        with get_db() as db:
            batch_row = db.execute("SELECT * FROM batch_jobs WHERE id = ?", (batch_id,)).fetchone()
            if batch_row:
                current_results = json.loads(batch_row["results"])
                current_results.append({"document_id": doc_id, "generation_id": gen_id, "status": gen_status})
                db.execute(
                    "UPDATE batch_jobs SET progress = ?, results = ? WHERE id = ?",
                    (i + 1, json.dumps(current_results), batch_id),
                )

    with get_db() as db:
        db.execute("UPDATE batch_jobs SET status = ? WHERE id = ?", (JobStatus.COMPLETED, batch_id))


@router.post("/")
async def create_batch(
    body: BatchJobCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    unique_ids = list(dict.fromkeys(body.document_ids))
    if not unique_ids:
        raise HTTPException(400, "No documents selected")
    check_user_rate(uid, max_per_hour=max(20, len(unique_ids) * 5))

    placeholders = ",".join("?" * len(unique_ids))
    with get_db() as db:
        rows = db.execute(
            f"SELECT id FROM documents WHERE user_id = ? AND id IN ({placeholders})",
            [uid, *unique_ids],
        ).fetchall()
        found = {r[0] for r in rows}
        if found != set(unique_ids):
            raise HTTPException(400, "One or more documents not found or not owned by you")

        if body.pattern_id is not None:
            p = db.execute(
                "SELECT id FROM patterns WHERE id = ? AND user_id = ?",
                (body.pattern_id, uid),
            ).fetchone()
            if not p:
                raise HTTPException(404, "Pattern not found")

        cursor = db.execute(
            "INSERT INTO batch_jobs (user_id, document_ids, pattern_id, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, json.dumps(unique_ids), body.pattern_id, len(unique_ids), JobStatus.PROCESSING, now_iso()),
        )
        batch_id = cursor.lastrowid
        row = db.execute("SELECT * FROM batch_jobs WHERE id = ?", (batch_id,)).fetchone()

    background_tasks.add_task(
        _run_batch_sync,
        batch_id,
        uid,
        unique_ids,
        body.pattern_id,
        body.num_questions,
        body.question_types,
    )
    return row_to_dict(row, BATCH_JSON_FIELDS)


@router.get("/")
def list_batches(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM batch_jobs WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
    return [row_to_dict(r, BATCH_JSON_FIELDS) for r in rows]


@router.get("/{batch_id}")
def get_batch(batch_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM batch_jobs WHERE id = ? AND user_id = ?",
            (batch_id, uid),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Batch job not found")
    return row_to_dict(row, BATCH_JSON_FIELDS)
