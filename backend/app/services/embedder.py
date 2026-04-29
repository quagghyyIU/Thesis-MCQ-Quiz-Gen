"""Embedding service for semantic search."""

import numpy as np

from app.services.llm_router import call_embeddings


async def embed_text(
    text: str,
    *,
    user_id: int | None = None,
    call_type: str = "embedding",
    db_log: bool = True,
) -> list[float]:
    embeddings = await call_embeddings([text], call_type=call_type, user_id=user_id, db_log=db_log)
    return embeddings[0] if embeddings else []


async def embed_texts(
    texts: list[str],
    *,
    user_id: int | None = None,
    call_type: str = "embedding",
    db_log: bool = True,
) -> list[list[float]]:
    return await call_embeddings(texts, call_type=call_type, user_id=user_id, db_log=db_log)


def cosine_search(query_vec: list[float], stored_vecs: list[list[float]], top_k: int = 8) -> list[int]:
    q = np.array(query_vec, dtype=np.float32)
    m = np.array(stored_vecs, dtype=np.float32)

    q_norm = q / (np.linalg.norm(q) + 1e-12)
    m_norms = m / (np.linalg.norm(m, axis=1, keepdims=True) + 1e-12)

    similarities = m_norms @ q_norm
    top_indices = np.argsort(similarities)[::-1][:top_k]
    return sorted(top_indices.tolist())
