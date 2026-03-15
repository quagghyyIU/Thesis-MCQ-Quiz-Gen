"""
Embedding service using Gemini Embedding API.
Converts text chunks into dense vectors for semantic search.
"""

import httpx
import numpy as np

from app.config import GEMINI_API_KEY

EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"
BATCH_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents"
EMBED_DIM = 3072


async def embed_text(text: str) -> list[float]:
    payload = {"content": {"parts": [{"text": text}]}}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(EMBED_URL, params={"key": GEMINI_API_KEY}, json=payload)
        resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise ValueError(f"Embedding error: {data['error'].get('message', '')}")
    return data["embedding"]["values"]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    # Gemini batch embed supports up to 100 texts per request
    all_embeddings = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i + 100]
        requests = [
            {"model": "models/gemini-embedding-001", "content": {"parts": [{"text": t}]}}
            for t in batch
        ]
        payload = {"requests": requests}
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(BATCH_EMBED_URL, params={"key": GEMINI_API_KEY}, json=payload)
            resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise ValueError(f"Batch embedding error: {data['error'].get('message', '')}")
        for emb in data["embeddings"]:
            all_embeddings.append(emb["values"])

    return all_embeddings


def cosine_search(query_vec: list[float], stored_vecs: list[list[float]], top_k: int = 8) -> list[int]:
    q = np.array(query_vec, dtype=np.float32)
    m = np.array(stored_vecs, dtype=np.float32)

    q_norm = q / (np.linalg.norm(q) + 1e-12)
    m_norms = m / (np.linalg.norm(m, axis=1, keepdims=True) + 1e-12)

    similarities = m_norms @ q_norm
    top_indices = np.argsort(similarities)[::-1][:top_k]
    return sorted(top_indices.tolist())
