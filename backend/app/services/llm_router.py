from __future__ import annotations

import time
import httpx

from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GROQ_API_KEY,
    GROQ_API_KEYS,
    GROQ_MODEL,
    OLLAMA_BASE,
    OLLAMA_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_AUTO_FREE_MODELS,
    OPENROUTER_EMBEDDING_MODEL,
    OPENROUTER_FREE_MODELS,
    OPENROUTER_MODEL,
    LLM_FALLBACK_CHAIN,
)
from app.database import get_db, now_iso
from app.errors import LLMQuotaError, LLMUnavailableError, is_quota_error

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_BASE = "https://api.groq.com/openai/v1"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"
EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"
BATCH_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents"

_groq_key_idx = 0
_openrouter_free_model_cache: tuple[float, list[str]] | None = None


def get_chain() -> list[tuple[str, str]]:
    return list(LLM_FALLBACK_CHAIN)


async def _expand_chain(chain: list[tuple[str, str]]) -> list[tuple[str, str]]:
    expanded: list[tuple[str, str]] = []
    for provider, model in chain:
        if provider == "openrouter" and model in {"openrouter/auto-free", "auto-free", "free"}:
            if not OPENROUTER_API_KEY:
                continue
            try:
                expanded.extend(("openrouter", free_model) for free_model in await _get_openrouter_free_models())
            except Exception:
                expanded.extend(("openrouter", free_model) for free_model in OPENROUTER_FREE_MODELS)
            continue
        expanded.append((provider, model))
    return expanded


def _log_attempt(
    *,
    user_id: int | None,
    call_type: str,
    provider: str,
    model: str,
    status: str,
    attempt_idx: int,
    latency_ms: int,
    token_usage: int,
    error_msg: str | None,
) -> None:
    if user_id is None:
        return
    with get_db() as db:
        db.execute(
            """
            INSERT INTO api_calls (
                user_id, call_type, provider, model, status, attempt_idx, latency_ms, error_msg, token_usage, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, call_type, provider, model, status, attempt_idx, latency_ms, error_msg, token_usage, now_iso()),
        )


async def _call_gemini(system_prompt: str, user_prompt: str, model: str) -> tuple[str, int]:
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 16384,
            "temperature": 0.7,
        },
    }
    url = f"{GEMINI_BASE}/{model}:generateContent"
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise ValueError(f"Gemini API error: {data['error'].get('message', str(data['error']))}")
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {})
    return text, usage.get("totalTokenCount", 0)


async def _call_groq(system_prompt: str, user_prompt: str, model: str) -> tuple[str, int]:
    global _groq_key_idx
    keys = GROQ_API_KEYS or ([GROQ_API_KEY] if GROQ_API_KEY else [])
    if not keys:
        raise ValueError("No Groq API key configured")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    url = f"{GROQ_BASE}/chat/completions"
    last_exc: Exception | None = None
    for offset in range(len(keys)):
        key = keys[(_groq_key_idx + offset) % len(keys)]
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
            data = resp.json()
            _groq_key_idx = (_groq_key_idx + offset) % len(keys)
            return data["choices"][0]["message"]["content"], data.get("usage", {}).get("total_tokens", 0)
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code != 429:
                raise
    if last_exc:
        raise last_exc
    raise ValueError("Groq call failed without exception")


async def _call_ollama(system_prompt: str, user_prompt: str, model: str) -> tuple[str, int]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7},
    }
    url = f"{OLLAMA_BASE}/api/chat"
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise ValueError(f"Ollama error: {data['error']}")
    text = data["message"]["content"]
    tokens = data.get("eval_count", 0) + data.get("prompt_eval_count", 0)
    return text, tokens


def _is_free_openrouter_model(model: dict) -> bool:
    model_id = str(model.get("id", ""))
    pricing = model.get("pricing") or {}
    if model_id.endswith(":free"):
        return True
    try:
        prompt = float(pricing.get("prompt", 1) or 0)
        completion = float(pricing.get("completion", 1) or 0)
        request = float(pricing.get("request", 0) or 0)
    except (TypeError, ValueError):
        return False
    return prompt == 0 and completion == 0 and request == 0


async def _get_openrouter_free_models() -> list[str]:
    global _openrouter_free_model_cache
    if not OPENROUTER_AUTO_FREE_MODELS:
        return list(OPENROUTER_FREE_MODELS)
    now = time.time()
    if _openrouter_free_model_cache and now - _openrouter_free_model_cache[0] < 3600:
        return list(_openrouter_free_model_cache[1])

    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{OPENROUTER_BASE}/models", headers=headers)
        resp.raise_for_status()
    data = resp.json()
    discovered = [
        model["id"]
        for model in data.get("data", [])
        if isinstance(model, dict) and model.get("id") and _is_free_openrouter_model(model)
    ]
    preferred = [model for model in OPENROUTER_FREE_MODELS if model in discovered]
    fallback = preferred + [model for model in discovered if model not in preferred]
    models = fallback or list(OPENROUTER_FREE_MODELS)
    _openrouter_free_model_cache = (now, models)
    return models


async def _call_openrouter(system_prompt: str, user_prompt: str, model: str) -> tuple[str, int]:
    if not OPENROUTER_API_KEY:
        raise ValueError("No OpenRouter API key configured")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(f"{OPENROUTER_BASE}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
    data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return text, usage.get("total_tokens", 0)


async def _call_openrouter_embeddings(texts: list[str]) -> list[list[float]]:
    if not OPENROUTER_API_KEY:
        raise ValueError("No OpenRouter API key configured for embeddings")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            payload = {
                "model": OPENROUTER_EMBEDDING_MODEL,
                "input": texts,
            }
            resp = await client.post(f"{OPENROUTER_BASE}/embeddings", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            rows = sorted(data["data"], key=lambda item: item.get("index", 0))
            return [row["embedding"] for row in rows]
        except httpx.HTTPStatusError:
            raise
        except Exception:
            all_embeddings: list[list[float]] = []
            for text in texts:
                payload = {
                    "model": OPENROUTER_EMBEDDING_MODEL,
                    "input": text,
                }
                resp = await client.post(f"{OPENROUTER_BASE}/embeddings", headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                all_embeddings.append(data["data"][0]["embedding"])
            return all_embeddings


PROVIDER_CALLS = {
    "gemini": _call_gemini,
    "groq": _call_groq,
    "ollama": _call_ollama,
    "openrouter": _call_openrouter,
}


async def call_llm(
    system: str,
    user: str,
    *,
    call_type: str,
    user_id: int | None,
    force_provider: str | None = None,
    force_model: str | None = None,
    db_log: bool = True,
) -> dict:
    attempts: list[dict] = []
    errors: list[str] = []
    saw_quota = False

    if force_provider:
        chain = [(force_provider, force_model or _default_model_for(force_provider))]
    else:
        chain = get_chain()
    chain = await _expand_chain(chain)

    for attempt_idx, (provider, model) in enumerate(chain):
        if provider not in PROVIDER_CALLS:
            continue
        if provider == "gemini" and not GEMINI_API_KEY:
            continue
        if provider == "groq" and not (GROQ_API_KEYS or GROQ_API_KEY):
            continue
        if provider == "openrouter" and not OPENROUTER_API_KEY:
            continue
        started = time.perf_counter()
        try:
            text, tokens = await PROVIDER_CALLS[provider](system, user, model)
            latency_ms = int((time.perf_counter() - started) * 1000)
            attempt = {
                "provider": provider,
                "model": model,
                "status": "ok",
                "attempt_idx": attempt_idx,
                "latency_ms": latency_ms,
                "token_usage": tokens,
            }
            attempts.append(attempt)
            if db_log:
                _log_attempt(
                    user_id=user_id,
                    call_type=call_type,
                    provider=provider,
                    model=model,
                    status="ok",
                    attempt_idx=attempt_idx,
                    latency_ms=latency_ms,
                    token_usage=tokens,
                    error_msg=None,
                )
            return {
                "text": text,
                "tokens": tokens,
                "provider": provider,
                "model": model,
                "attempts": attempts,
            }
        except Exception as exc:
            msg = str(exc)
            status = "quota" if is_quota_error(msg) else "error"
            latency_ms = int((time.perf_counter() - started) * 1000)
            if status == "quota":
                saw_quota = True
            errors.append(f"{provider}:{model}: {msg}")
            attempts.append(
                {
                    "provider": provider,
                    "model": model,
                    "status": status,
                    "attempt_idx": attempt_idx,
                    "latency_ms": latency_ms,
                    "token_usage": 0,
                    "error_msg": msg,
                }
            )
            if db_log:
                _log_attempt(
                    user_id=user_id,
                    call_type=call_type,
                    provider=provider,
                    model=model,
                    status=status,
                    attempt_idx=attempt_idx,
                    latency_ms=latency_ms,
                    token_usage=0,
                    error_msg=msg[:500],
                )
            if force_provider:
                break

    detail = "; ".join(errors) if errors else "No available provider in fallback chain"
    if saw_quota:
        raise LLMQuotaError(f"All AI providers are rate-limited. {detail}", retry_after=60)
    raise LLMUnavailableError(f"All AI providers failed. {detail}")


async def call_embeddings(
    texts: list[str],
    *,
    call_type: str,
    user_id: int | None,
    db_log: bool = True,
) -> list[list[float]]:
    if not texts:
        return []
    if not GEMINI_API_KEY and not OPENROUTER_API_KEY:
        raise LLMUnavailableError("No embedding provider configured")

    started = time.perf_counter()
    try:
        if not GEMINI_API_KEY:
            embeddings = await _call_openrouter_embeddings(texts)
            latency_ms = int((time.perf_counter() - started) * 1000)
            if db_log:
                _log_attempt(
                    user_id=user_id,
                    call_type=call_type,
                    provider="openrouter",
                    model=OPENROUTER_EMBEDDING_MODEL,
                    status="ok",
                    attempt_idx=0,
                    latency_ms=latency_ms,
                    token_usage=0,
                    error_msg=None,
                )
            return embeddings

        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), 100):
            batch = texts[i : i + 100]
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

        latency_ms = int((time.perf_counter() - started) * 1000)
        if db_log:
            _log_attempt(
                user_id=user_id,
                call_type=call_type,
                provider="gemini" if GEMINI_API_KEY else "openrouter",
                model="gemini-embedding-001" if GEMINI_API_KEY else OPENROUTER_EMBEDDING_MODEL,
                status="ok",
                attempt_idx=0,
                latency_ms=latency_ms,
                token_usage=0,
                error_msg=None,
            )
        return all_embeddings
    except Exception as exc:
        msg = str(exc)
        status = "quota" if is_quota_error(msg) else "error"
        if GEMINI_API_KEY and OPENROUTER_API_KEY:
            try:
                embeddings = await _call_openrouter_embeddings(texts)
                latency_ms = int((time.perf_counter() - started) * 1000)
                if db_log:
                    _log_attempt(
                        user_id=user_id,
                        call_type=call_type,
                        provider="openrouter",
                        model=OPENROUTER_EMBEDDING_MODEL,
                        status="ok",
                        attempt_idx=1,
                        latency_ms=latency_ms,
                        token_usage=0,
                        error_msg=None,
                    )
                return embeddings
            except Exception as fallback_exc:
                msg = f"{msg}; OpenRouter embedding fallback failed: {fallback_exc}"
                status = "quota" if is_quota_error(msg) else "error"
        latency_ms = int((time.perf_counter() - started) * 1000)
        if db_log:
            _log_attempt(
                user_id=user_id,
                call_type=call_type,
                provider="gemini",
                model="gemini-embedding-001",
                status=status,
                attempt_idx=0,
                latency_ms=latency_ms,
                token_usage=0,
                error_msg=msg[:500],
            )
        if status == "quota":
            raise LLMQuotaError(f"Embedding quota exceeded. {msg}", retry_after=60) from exc
        raise LLMUnavailableError(f"Embedding provider failed. {msg}") from exc


def _default_model_for(provider: str) -> str:
    if provider == "groq":
        return GROQ_MODEL
    if provider == "gemini":
        return GEMINI_MODEL
    if provider == "ollama":
        return OLLAMA_MODEL
    if provider == "openrouter":
        return OPENROUTER_MODEL
    return ""
