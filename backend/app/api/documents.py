import json
import os
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.database import get_db, now_iso, row_to_dict
from app.services.document_processor import process_document
from app.services.embedder import embed_texts
from app.config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB

router = APIRouter()

DOC_JSON_FIELDS = ["processed_chunks"]

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Use PDF, DOCX, or PPTX.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(400, f"File too large ({size_mb:.1f}MB). Max is {MAX_UPLOAD_SIZE_MB}MB.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    file_type = ALLOWED_TYPES[file.content_type]

    try:
        raw_text, chunks, language = process_document(file_path, file_type)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(500, f"Failed to process document: {str(e)}")

    # Embed all chunks via Gemini Embedding API
    try:
        embeddings = await embed_texts(chunks)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(500, f"Failed to embed document chunks: {str(e)}")

    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO documents (filename, file_type, raw_text, processed_chunks, language, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (file.filename, file_type, raw_text, json.dumps(chunks), language, now_iso()),
        )
        doc_id = cursor.lastrowid

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            db.execute(
                "INSERT INTO chunk_embeddings (document_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?)",
                (doc_id, i, chunk, json.dumps(emb)),
            )

        db.execute(
            "INSERT INTO api_calls (call_type, provider, token_usage, created_at) VALUES (?, ?, ?, ?)",
            ("document_embedding", "gemini", 0, now_iso()),
        )

        doc = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return row_to_dict(doc, DOC_JSON_FIELDS)


@router.get("/")
def list_documents():
    with get_db() as db:
        rows = db.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r, DOC_JSON_FIELDS) for r in rows]


@router.get("/{doc_id}")
def get_document(doc_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Document not found")
    return row_to_dict(row, DOC_JSON_FIELDS)


@router.delete("/{doc_id}")
def delete_document(doc_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Document not found")
        file_path = os.path.join(UPLOAD_DIR, row["filename"])
        if os.path.exists(file_path):
            os.remove(file_path)
        db.execute("DELETE FROM chunk_embeddings WHERE document_id = ?", (doc_id,))
        db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    return {"detail": "Deleted"}
