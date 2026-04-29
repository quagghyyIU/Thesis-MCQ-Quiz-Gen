from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user
from app.config import GEMINI_MODEL
from app.database import get_db

router = APIRouter()


def _build_filters(
    *,
    provider: str | None = None,
    model: str | None = None,
    call_type: str | None = None,
    status: str | None = None,
    from_ts: str | None = None,
    to_ts: str | None = None,
) -> tuple[str, list]:
    clauses: list[str] = []
    params: list = []
    if provider:
        clauses.append("provider = ?")
        params.append(provider)
    if model:
        clauses.append("model = ?")
        params.append(model)
    if call_type:
        clauses.append("call_type = ?")
        params.append(call_type)
    if status:
        clauses.append("status = ?")
        params.append(status)
    if from_ts:
        clauses.append("created_at >= ?")
        params.append(from_ts)
    if to_ts:
        clauses.append("created_at <= ?")
        params.append(to_ts)
    sql = (" AND " + " AND ".join(clauses)) if clauses else ""
    return sql, params


@router.get("/")
def get_usage_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        total_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM api_calls WHERE user_id = ?",
            (uid,),
        ).fetchone()[0]
        total_calls = db.execute(
            "SELECT COUNT(*) FROM api_calls WHERE user_id = ?",
            (uid,),
        ).fetchone()[0]
        total_gens = db.execute(
            "SELECT COUNT(*) FROM generations WHERE status = 'completed' AND user_id = ?",
            (uid,),
        ).fetchone()[0]
        failed = db.execute(
            "SELECT COUNT(*) FROM generations WHERE status = 'failed' AND user_id = ?",
            (uid,),
        ).fetchone()[0]
        today = datetime.now().date().isoformat()
        today_tokens = db.execute(
            "SELECT COALESCE(SUM(token_usage), 0) FROM api_calls WHERE user_id = ? AND DATE(created_at) = DATE(?)",
            (uid, today),
        ).fetchone()[0]
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        history = db.execute(
            """SELECT DATE(created_at) as date, COALESCE(SUM(token_usage), 0) as tokens, COUNT(*) as count
               FROM api_calls WHERE user_id = ? AND created_at > ?
               GROUP BY DATE(created_at)""",
            (uid, seven_days_ago),
        ).fetchall()
        call_breakdown = db.execute(
            """SELECT call_type, provider, COUNT(*) as count, COALESCE(SUM(token_usage), 0) as tokens
               FROM api_calls WHERE user_id = ? GROUP BY call_type, provider""",
            (uid,),
        ).fetchall()
        provider_breakdown = db.execute(
            """SELECT provider, COUNT(*) as count, COALESCE(SUM(token_usage), 0) as tokens
               FROM api_calls WHERE user_id = ? GROUP BY provider""",
            (uid,),
        ).fetchall()
        model_breakdown = db.execute(
            """SELECT provider, model, COUNT(*) as count, COALESCE(SUM(token_usage), 0) as tokens
               FROM api_calls WHERE user_id = ? GROUP BY provider, model""",
            (uid,),
        ).fetchall()
        fallback_today = db.execute(
            """SELECT COUNT(*) FROM api_calls
               WHERE user_id = ? AND status = 'ok' AND attempt_idx > 0 AND DATE(created_at) = DATE(?)""",
            (uid, today),
        ).fetchone()[0]

    daily_history = sorted(
        [{"date": r[0], "tokens": r[1], "generations": r[2]} for r in history],
        key=lambda x: x["date"],
        reverse=True,
    )
    return {
        "model": GEMINI_MODEL,
        "total_tokens_used": total_tokens,
        "total_generations": total_gens,
        "total_api_calls": total_calls,
        "today_tokens": today_tokens,
        "failed_generations": failed,
        "daily_history": daily_history,
        "call_breakdown": [{"type": r[0], "provider": r[1], "count": r[2], "tokens": r[3]} for r in call_breakdown],
        "provider_breakdown": [{"provider": r[0], "count": r[1], "tokens": r[2]} for r in provider_breakdown],
        "model_breakdown": [
            {"provider": r[0], "model": r[1], "count": r[2], "tokens": r[3]} for r in model_breakdown
        ],
        "fallback_today": fallback_today,
        "note": "AI calls include fallback attempts; use filters for provider/model/status.",
    }


@router.get("/calls")
def get_usage_calls(
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
    call_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    from_ts: str | None = Query(default=None, alias="from"),
    to_ts: str | None = Query(default=None, alias="to"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    where_sql, params = _build_filters(
        provider=provider, model=model, call_type=call_type, status=status, from_ts=from_ts, to_ts=to_ts
    )
    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT id, call_type, provider, model, status, attempt_idx, latency_ms, error_msg, token_usage, created_at
            FROM api_calls
            WHERE user_id = ? {where_sql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (uid, *params, limit, offset),
        ).fetchall()
    return [
        {
            "id": r[0],
            "call_type": r[1],
            "provider": r[2],
            "model": r[3],
            "status": r[4],
            "attempt_idx": r[5],
            "latency_ms": r[6],
            "error_msg": r[7],
            "token_usage": r[8],
            "created_at": r[9],
        }
        for r in rows
    ]


@router.get("/breakdown")
def get_usage_breakdown(
    dimension: str = Query(default="provider"),
    days: int = Query(default=7, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    if dimension not in {"provider", "model", "call_type", "status"}:
        dimension = "provider"
    uid = current_user["id"]
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    select_key = "provider" if dimension == "provider" else dimension
    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT {select_key} as key, COUNT(*) as count, COALESCE(SUM(token_usage), 0) as tokens
            FROM api_calls
            WHERE user_id = ? AND created_at >= ?
            GROUP BY {select_key}
            ORDER BY count DESC
            """,
            (uid, cutoff),
        ).fetchall()
    return [{"key": r[0], "count": r[1], "tokens": r[2]} for r in rows]


@router.get("/options")
def get_usage_options(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as db:
        providers = [r[0] for r in db.execute("SELECT DISTINCT provider FROM api_calls WHERE user_id = ?", (uid,)).fetchall()]
        models = [r[0] for r in db.execute("SELECT DISTINCT model FROM api_calls WHERE user_id = ?", (uid,)).fetchall()]
        call_types = [r[0] for r in db.execute("SELECT DISTINCT call_type FROM api_calls WHERE user_id = ?", (uid,)).fetchall()]
        statuses = [r[0] for r in db.execute("SELECT DISTINCT status FROM api_calls WHERE user_id = ?", (uid,)).fetchall()]
    return {
        "providers": sorted([p for p in providers if p]),
        "models": sorted([m for m in models if m]),
        "call_types": sorted([c for c in call_types if c]),
        "statuses": sorted([s for s in statuses if s]),
    }


@router.get("/check-quota")
def check_gemini_quota(_user: dict = Depends(get_current_user)):
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
        if "quota" in str(data).lower() or resp.status_code == 429:
            return {"status": "quota_exceeded", "error": data.get("error", {}).get("message", "Quota exceeded")}
        return {"status": "error", "error": data.get("error", {}).get("message", str(data))}
    except Exception as e:
        return {"status": "error", "error": str(e)}
