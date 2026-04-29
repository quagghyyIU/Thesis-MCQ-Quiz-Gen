"""
Selects the most relevant chunks from a document for question generation.
Uses semantic search via Gemini embeddings + cosine similarity (RAG).
Falls back to uniform sampling if no embeddings are available.
"""

import json

from app.database import get_db
from app.services.embedder import embed_text, cosine_search


async def select_relevant_chunks(
    document_id: int,
    chunks: list[str],
    query: str = "",
    max_chunks: int = 8,
    pattern: dict | None = None,
    difficulty_distribution: dict | None = None,
) -> list[str]:
    if len(chunks) <= max_chunks:
        return chunks

    # Load stored embeddings from DB
    with get_db() as db:
        rows = db.execute(
            "SELECT chunk_index, chunk_text, embedding FROM chunk_embeddings WHERE document_id = ? ORDER BY chunk_index",
            (document_id,),
        ).fetchall()

    if not rows:
        # Fallback: uniform sampling if no embeddings stored
        step = max(1, len(chunks) // max_chunks)
        return [chunks[i] for i in range(0, len(chunks), step)][:max_chunks]

    stored_vecs = [json.loads(r["embedding"]) for r in rows]
    chunk_texts = [r["chunk_text"] for r in rows]

    if not query:
        query = _build_retrieval_query(chunks, pattern, difficulty_distribution)

    query_vec = await embed_text(query)
    top_indices = cosine_search(query_vec, stored_vecs, top_k=max_chunks)

    return [chunk_texts[i] for i in top_indices if i < len(chunk_texts)]


def _build_retrieval_query(
    chunks: list[str],
    pattern: dict | None = None,
    difficulty_distribution: dict | None = None,
) -> str:
    """Build a content-bearing query for RAG retrieval.

    The generation request may not include a topic string, so use the exam
    pattern examples and requested difficulty shape before falling back to the
    first document chunk.
    """
    parts: list[str] = []

    if pattern:
        sample_questions = pattern.get("sample_questions", [])
        if sample_questions:
            parts.append(" ".join(str(q) for q in sample_questions[:5]))

        config = pattern.get("pattern_config", {})
        language = config.get("language")
        if language:
            parts.append(f"language {language}")

    if difficulty_distribution:
        requested = [
            f"{level} {pct}%"
            for level, pct in difficulty_distribution.items()
            if pct
        ]
        if requested:
            parts.append("difficulty distribution " + ", ".join(requested))

    if parts:
        return "\n".join(parts)[:2000]

    return chunks[0][:500]
