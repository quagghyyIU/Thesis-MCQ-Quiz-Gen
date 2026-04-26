"""File-based cache + async rate limiter for the eval pipeline.

Keeps backend code untouched. Used only by eval/run_eval.py to avoid
repeating expensive LLM/embedding calls on reruns.
"""

import asyncio
import hashlib
import json
import time
from pathlib import Path
from typing import Any, Awaitable, Callable

CACHE_DIR = Path(__file__).resolve().parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)


def _key(namespace: str, payload: Any) -> Path:
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    digest = hashlib.sha256(blob.encode("utf-8")).hexdigest()
    bucket = CACHE_DIR / namespace
    bucket.mkdir(exist_ok=True)
    return bucket / f"{digest}.json"


async def cached(namespace: str, payload: Any, factory: Callable[[], Awaitable[Any]]) -> Any:
    path = _key(namespace, payload)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    value = await factory()
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    return value


class RateLimiter:
    """Async limiter with max concurrency + minimum spacing between calls."""

    def __init__(self, max_concurrency: int = 2, min_interval_s: float = 1.2):
        self._sem = asyncio.Semaphore(max_concurrency)
        self._min_interval = min_interval_s
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def __aenter__(self):
        await self._sem.acquire()
        async with self._lock:
            now = time.monotonic()
            wait = self._min_interval - (now - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self._sem.release()
