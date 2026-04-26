"""Per-user sliding-window rate limit on top of the existing api_calls table."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.errors import RateLimitError

DEFAULT_PER_HOUR = int(os.getenv("MAX_GENERATIONS_PER_HOUR", "20"))


def check_user_rate(user_id: int, call_type: str = "question_generation", max_per_hour: int | None = None) -> None:
    limit = max_per_hour if max_per_hour is not None else DEFAULT_PER_HOUR
    if limit <= 0:
        return

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    with get_db() as db:
        row = db.execute(
            "SELECT COUNT(*) as c, MIN(created_at) as oldest FROM api_calls "
            "WHERE user_id = ? AND call_type = ? AND created_at > ?",
            (user_id, call_type, cutoff),
        ).fetchone()

    count = row["c"] if row else 0
    if count < limit:
        return

    retry_after = 3600
    if row and row["oldest"]:
        try:
            oldest = datetime.fromisoformat(row["oldest"])
            elapsed = (datetime.now(timezone.utc) - oldest).total_seconds()
            retry_after = max(60, int(3600 - elapsed))
        except ValueError:
            pass

    raise RateLimitError(
        f"You have used {count}/{limit} generations in the last hour.",
        retry_after=retry_after,
    )
