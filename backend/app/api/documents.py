import json
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.database import get_db, now_iso, row_to_dict
from app.services.document_processor import process_document
from app.services.embedder import embed_texts
from app.config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB
from app.api.auth import get_current_user

router = APIRouter()

DOC_JSON_FIELDS = ["processed_chunks"]

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
}


def _safe_upload_filename(filename: str, file_type: str) -> str:
    stem = os.path.splitext(os.path.basename(filename))[0].strip()
    safe_stem = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in stem).strip("_")
    if not safe_stem:
        safe_stem = "upload"
    return f"{uuid.uuid4().hex}_{safe_stem[:80]}.{file_type}"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Use PDF, DOCX, or PPTX.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(400, f"File too large ({size_mb:.1f}MB). Max is {MAX_UPLOAD_SIZE_MB}MB.")

    file_type = ALLOWED_TYPES[file.content_type]
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stored_filename = _safe_upload_filename(file.filename or "upload", file_type)
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        raw_text, chunks, language = process_document(file_path, file_type)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(500, f"Failed to process document: {str(e)}")

    try:
        embeddings = await embed_texts(
            chunks,
            user_id=current_user["id"],
            call_type="document_embedding",
        )
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(500, f"Failed to embed document chunks: {str(e)}")

    uid = current_user["id"]
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO documents (user_id, filename, file_type, raw_text, processed_chunks, language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid, stored_filename, file_type, raw_text, json.dumps(chunks), language, now_iso()),
        )
        doc_id = cursor.lastrowid

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            db.execute(
                "INSERT INTO chunk_embeddings (document_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?)",
                (doc_id, i, chunk, json.dumps(emb)),
            )

        doc = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return row_to_dict(doc, DOC_JSON_FIELDS)


@router.get("/")
def list_documents(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
    return [row_to_dict(r, DOC_JSON_FIELDS) for r in rows]


@router.get("/{doc_id}")
def get_document(doc_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, uid),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Document not found")
    return row_to_dict(row, DOC_JSON_FIELDS)


@router.delete("/{doc_id}")
def delete_document(doc_id: int, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, uid),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Document not found")
        file_path = os.path.join(UPLOAD_DIR, row["filename"])
        if os.path.exists(file_path):
            os.remove(file_path)
        db.execute("DELETE FROM chunk_embeddings WHERE document_id = ?", (doc_id,))
        db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    return {"detail": "Deleted"}
