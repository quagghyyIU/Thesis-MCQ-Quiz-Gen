import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_KEYS = [
    k.strip()
    for k in (os.getenv("GROQ_API_KEYS") or GROQ_API_KEY or "").split(",")
    if k.strip()
]
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/auto-free")
OPENROUTER_EMBEDDING_MODEL = os.getenv("OPENROUTER_EMBEDDING_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2:free")
OPENROUTER_AUTO_FREE_MODELS = os.getenv("OPENROUTER_AUTO_FREE_MODELS", "true").lower() in {"1", "true", "yes", "on"}
DEFAULT_OPENROUTER_FREE_MODELS = ",".join(
    [
        "openrouter/owl-alpha",
        "minimax/minimax-m2.5:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "openai/gpt-oss-20b:free",
        "poolside/laguna-xs-2:free",
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "nvidia/nemotron-nano-12b-v2-vl:free",
        "nvidia/nemotron-nano-9b-v2:free",
        "google/gemma-4-26b-a4b-it:free",
        "tencent/hy3-preview:free",
    ]
)
OPENROUTER_FREE_MODELS = [
    model.strip()
    for model in os.getenv("OPENROUTER_FREE_MODELS", DEFAULT_OPENROUTER_FREE_MODELS).split(",")
    if model.strip()
]
DEFAULT_LLM_FALLBACK_CHAIN = ",".join(
    [
        "groq:llama-3.3-70b-versatile",
        "groq:meta-llama/llama-4-scout-17b-16e-instruct",
        "groq:openai/gpt-oss-120b",
        "groq:qwen/qwen3-32b",
        "groq:llama-3.1-8b-instant",
        "openrouter:openrouter/auto-free",
        "ollama:gemma4:e4b-it-q4_K_M",
    ]
)
_chain_csv = os.getenv("LLM_FALLBACK_CHAIN", DEFAULT_LLM_FALLBACK_CHAIN)
LLM_FALLBACK_CHAIN = [
    tuple(item.strip().split(":", 1))
    for item in _chain_csv.split(",")
    if ":" in item
]

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b-it-q4_K_M")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "2000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set to a strong random value.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week
