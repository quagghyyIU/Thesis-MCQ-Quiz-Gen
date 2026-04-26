"""Typed application errors with structured JSON responses."""
from __future__ import annotations


class AppError(Exception):
    code: str = "INTERNAL_ERROR"
    status: int = 500

    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.message = message
        self.retry_after = retry_after


class LLMQuotaError(AppError):
    code = "LLM_QUOTA_EXCEEDED"
    status = 503


class LLMUnavailableError(AppError):
    code = "LLM_UNAVAILABLE"
    status = 503


class RateLimitError(AppError):
    code = "RATE_LIMITED"
    status = 429


class GenerationParseError(AppError):
    code = "GENERATION_INVALID"
    status = 502


def is_quota_error(message: str) -> bool:
    m = message.lower()
    return any(s in m for s in ("429", "quota", "rate", "exhausted", "too many"))
