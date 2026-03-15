from datetime import datetime, timedelta
from fastapi import APIRouter

from app.database import get_db
from app.config import GEMINI_MODEL

router = APIRouter()


@router.get("/")
def get_usage_stats():
    """Get API usage statistics from local database (generations + other API calls)."""
    with get_db() as db:
        # Generation tokens
        gen_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM generations WHERE status = 'completed'"
        ).fetchone()[0]

        # Other API call tokens (extraction, embedding — exclude question_generation to avoid double-counting)
        other_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM api_calls WHERE call_type != 'question_generation'"
        ).fetchone()[0]

        total_tokens = gen_tokens + other_tokens

        # Total generations
        total_gens = db.execute(
            "SELECT COUNT(*) FROM generations WHERE status = 'completed'"
        ).fetchone()[0]

        # Total other API calls (exclude question_generation to avoid double-counting with generations)
        total_other = db.execute(
            "SELECT COUNT(*) FROM api_calls WHERE call_type != 'question_generation'"
        ).fetchone()[0]

        # Today's usage (both sources)
        today = datetime.now().date().isoformat()
        today_gen_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM generations WHERE status = 'completed' AND DATE(created_at) = DATE(?)",
            (today,)
        ).fetchone()[0]
        today_other_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM api_calls WHERE call_type != 'question_generation' AND DATE(created_at) = DATE(?)",
            (today,)
        ).fetchone()[0]

        # Recent 7 days history (combined)
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        gen_history = db.execute(
            """SELECT DATE(created_at) as date, SUM(token_usage) as tokens, COUNT(*) as count
               FROM generations WHERE status = 'completed' AND created_at > ?
               GROUP BY DATE(created_at)""",
            (seven_days_ago,)
        ).fetchall()
        other_history = db.execute(
            """SELECT DATE(created_at) as date, SUM(token_usage) as tokens, COUNT(*) as count
               FROM api_calls WHERE call_type != 'question_generation' AND created_at > ?
               GROUP BY DATE(created_at)""",
            (seven_days_ago,)
        ).fetchall()

        daily = {}
        for r in gen_history:
            daily.setdefault(r[0], {"tokens": 0, "calls": 0})
            daily[r[0]]["tokens"] += r[1]
            daily[r[0]]["calls"] += r[2]
        for r in other_history:
            daily.setdefault(r[0], {"tokens": 0, "calls": 0})
            daily[r[0]]["tokens"] += r[1]
            daily[r[0]]["calls"] += r[2]

        daily_history = sorted(
            [{"date": d, "tokens": v["tokens"], "generations": v["calls"]} for d, v in daily.items()],
            key=lambda x: x["date"], reverse=True,
        )

        # Failed generations count
        failed = db.execute(
            "SELECT COUNT(*) FROM generations WHERE status = 'failed'"
        ).fetchone()[0]

        # Task breakdown (exclude question_generation — already covered by provider_breakdown from generations)
        call_breakdown = db.execute(
            "SELECT call_type, provider, COUNT(*) as count, SUM(token_usage) as tokens FROM api_calls WHERE call_type != 'question_generation' GROUP BY call_type, provider"
        ).fetchall()

        # Provider breakdown across generations
        provider_breakdown = db.execute(
            "SELECT provider, COUNT(*) as count, SUM(token_usage) as tokens FROM generations WHERE status = 'completed' GROUP BY provider"
        ).fetchall()

    return {
        "model": GEMINI_MODEL,
        "total_tokens_used": total_tokens,
        "total_generations": total_gens,
        "total_api_calls": total_gens + total_other,
        "today_tokens": today_gen_tokens + today_other_tokens,
        "failed_generations": failed,
        "daily_history": daily_history,
        "call_breakdown": [{"type": r[0], "provider": r[1], "count": r[2], "tokens": r[3]} for r in call_breakdown],
        "provider_breakdown": [{"provider": r[0], "count": r[1], "tokens": r[2]} for r in provider_breakdown],
        "note": "Gemini free tier: 1500 req/day, 1M tokens/min. Check https://aistudio.google.com/app/apikey for exact quota.",
    }


@router.get("/check-quota")
def check_gemini_quota():
    """Check current Gemini API quota by making a test request."""
    import httpx
    from app.config import GEMINI_API_KEY

    test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}"
    try:
        resp = httpx.get(test_url, params={"key": GEMINI_API_KEY}, timeout=10)
        data = resp.json()

        if resp.status_code == 200:
            return {
                "status": "valid",
                "model": data.get("displayName"),
                "input_token_limit": data.get("inputTokenLimit"),
                "output_token_limit": data.get("outputTokenLimit"),
            }
        elif "quota" in str(data).lower() or resp.status_code == 429:
            return {"status": "quota_exceeded", "error": data.get("error", {}).get("message", "Quota exceeded")}
        else:
            return {"status": "error", "error": data.get("error", {}).get("message", str(data))}
    except Exception as e:
        return {"status": "error", "error": str(e)}
