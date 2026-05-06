from fastapi import APIRouter, Depends

from app.api.auth import get_current_user
from app.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    GEMINI_MODEL,
    GROQ_MODEL,
    LLM_FALLBACK_CHAIN,
    MAX_UPLOAD_SIZE_MB,
    OLLAMA_BASE,
    OLLAMA_MODEL,
    OPENROUTER_AUTO_FREE_MODELS,
    OPENROUTER_EMBEDDING_MODEL,
    OPENROUTER_FREE_MODELS,
    OPENROUTER_MODEL,
)

router = APIRouter()


@router.get("/")
def get_settings(_current_user: dict = Depends(get_current_user)):
    return {
        "models": {
            "gemini": GEMINI_MODEL,
            "groq": GROQ_MODEL,
            "openrouter": OPENROUTER_MODEL,
            "ollama": OLLAMA_MODEL,
            "openrouter_embedding": OPENROUTER_EMBEDDING_MODEL,
        },
        "fallback_chain": [
            {"provider": provider, "model": model}
            for provider, model in LLM_FALLBACK_CHAIN
        ],
        "openrouter": {
            "auto_free_models": OPENROUTER_AUTO_FREE_MODELS,
            "free_models": OPENROUTER_FREE_MODELS,
        },
        "rag": {
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "retrieval_top_k_default": 8,
            "evaluation_top_k": 3,
            "max_upload_size_mb": MAX_UPLOAD_SIZE_MB,
        },
        "local": {
            "ollama_base": OLLAMA_BASE,
        },
    }
