"""
Today API endpoints — powers the /today page.

Endpoints:
- GET  /api/today/champions       — top intent leads
- GET  /api/goals/current         — active goals + progress
- POST /api/goals                 — create/update a goal
- GET  /api/digests/latest        — yesterday's digest
- GET  /api/activity/streak       — 30-day streak + current count

All endpoints are additive. They do not modify any existing table schema.
Views referenced (v_champion_leads, v_goal_progress, v_daily_activity) are
created by migrations/phase1_today_migration.sql — endpoints return a
graceful empty response if the views don't yet exist.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.auth import get_current_user
from core.supabase_client import get_client

logger = logging.getLogger("today")

router = APIRouter(tags=["today"])


# ---------------------------------------------------------------------------
# Champion Leads
# ---------------------------------------------------------------------------

@router.get("/api/today/champions")
def champion_leads() -> dict[str, Any]:
    """
    Returns top intent leads. Shape:
      { "leads": [...], "has_scored_data": bool }
    If v_champion_leads doesn't exist or returns no rows, emits empty list and
    has_scored_data=False so the UI can show an empty state with context.
    """
    client = get_client()
    try:
        res = client.table("v_champion_leads").select("*").limit(20).execute()
        rows = res.data or []
    except Exception as e:
        logger.warning(f"v_champion_leads not available: {e}")
        rows = []

    # Count how many leads have a non-null intent_score — signals whether the
    # nightly scoring job has ever run. We probe `leads` directly.
    has_scored = False
    try:
        probe = (
            client.table("leads")
            .select("id", count="exact")
            .not_.is_("intent_score", "null")
            .limit(1)
            .execute()
        )
        has_scored = (probe.count or 0) > 0
    except Exception:
        has_scored = False

    leads = [_shape_champion_row(r) for r in rows]
    return {"leads": leads, "has_scored_data": has_scored}


def _shape_champion_row(row: dict) -> dict:
    score = int(row.get("intent_score") or 0)
    name = (
        row.get("full_name")
        or " ".join(filter(None, [row.get("first_name"), row.get("last_name")]))
        or row.get("email")
        or "Unknown"
    )
    opens = int(row.get("email_opens") or 0)
    replies = int(row.get("email_replies") or 0)
    clicks = int(row.get("email_clicks") or 0)
    days = row.get("days_since_touch")

    # Build signal line from whatever we actually have.
    parts = []
    if replies: parts.append(f"replied {replies}×")
    if opens:   parts.append(f"opened {opens}×")
    if clicks:  parts.append(f"{clicks} clicks")
    if days is not None and days <= 2:
        parts.append("recent touch")
    primary_signal = " · ".join(parts) if parts else "high intent score"

    # Action / CTA inference
    if score >= 90:
        action, cta = "close", "Close →"
    elif replies > 0:
        action, cta = "reply", "Reply →"
    elif opens > 2 or clicks > 0:
        action, cta = "prep", "Prep →"
    else:
        action, cta = "view", "View"

    return {
        "id": row.get("id"),
        "name": name,
        "company": row.get("company_name"),
        "country": row.get("country"),
        "stage": row.get("stage"),
        "intent_score": score,
        "opens_30d": opens,
        "replies_30d": replies,
        "clicks_30d": clicks,
        "days_since_touch": days,
        "primary_signal": primary_signal,
        "suggested_action": action,
        "cta_label": cta,
    }


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

GoalMetric = Literal["mrr", "meetings_booked", "replies_received", "outreach_volume"]
GoalPeriod = Literal["monthly", "quarterly", "yearly"]


class GoalIn(BaseModel):
    metric: GoalMetric
    target_value: float = Field(gt=0)
    period_type: GoalPeriod = "monthly"
    period_start: date | None = None
    period_end: date | None = None


@router.get("/api/goals/current")
def goals_current(user=Depends(get_current_user)) -> dict[str, Any]:
    """
    Current period's goals with progress. Degrades to empty list if
    v_goal_progress is missing.
    """
    user_id = user.get("sub")
    client = get_client()
    today = date.today()

    try:
        res = (
            client.table("v_goal_progress")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        logger.warning(f"v_goal_progress not available: {e}")
        rows = []

    goals = [_shape_goal_row(r) for r in rows]

    period_start = goals[0]["period_start"] if goals else today.replace(day=1).isoformat()
    period_end = goals[0]["period_end"] if goals else today.isoformat()
    period_label = _period_label(period_start, period_end)

    return {
        "goals": goals,
        "period_start": period_start,
        "period_end": period_end,
        "period_label": period_label,
    }


def _shape_goal_row(row: dict) -> dict:
    target = float(row.get("target_value") or 0)
    current = float(row.get("current_value") or 0)
    elapsed = int(row.get("days_elapsed") or 0)
    total = int(row.get("days_total") or 1)
    pace_expected = (elapsed / total) * target if total else 0.0

    if target == 0:
        status = "on_pace"
    elif current >= pace_expected * 1.1:
        status = "ahead"
    elif current >= pace_expected * 0.9:
        status = "on_pace"
    elif current >= pace_expected * 0.8:
        status = "slightly_behind"
    else:
        status = "behind"

    return {
        "id": row.get("id"),
        "metric": row.get("metric"),
        "target_value": target,
        "current_value": current,
        "period_start": str(row.get("period_start")),
        "period_end": str(row.get("period_end")),
        "days_remaining": int(row.get("days_remaining") or 0),
        "days_elapsed": elapsed,
        "days_total": total,
        "pace_expected": round(pace_expected, 2),
        "status": status,
    }


def _period_label(start: str, end: str) -> str:
    try:
        d = date.fromisoformat(start)
        return d.strftime("%B %Y")
    except Exception:
        return "Current period"


@router.post("/api/goals")
def upsert_goal(body: GoalIn, user=Depends(get_current_user)) -> dict[str, Any]:
    """Create or update a goal. Uniqueness on (user_id, period_type, period_start, metric)."""
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="No user id in token")

    today = date.today()
    period_start = body.period_start or today.replace(day=1)
    if body.period_end:
        period_end = body.period_end
    else:
        if body.period_type == "monthly":
            nxt = period_start.replace(day=1) + timedelta(days=32)
            period_end = nxt.replace(day=1) - timedelta(days=1)
        elif body.period_type == "quarterly":
            period_end = period_start + timedelta(days=91)
        else:
            period_end = date(period_start.year, 12, 31)

    payload = {
        "user_id": user_id,
        "period_type": body.period_type,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "metric": body.metric,
        "target_value": body.target_value,
    }
    client = get_client()
    res = (
        client.table("goals")
        .upsert(payload, on_conflict="user_id,period_type,period_start,metric")
        .execute()
    )
    return {"status": "ok", "goal": (res.data or [payload])[0]}


# ---------------------------------------------------------------------------
# Daily Digest
# ---------------------------------------------------------------------------

@router.get("/api/digests/latest")
def latest_digest(user=Depends(get_current_user)) -> dict[str, Any] | None:
    user_id = user.get("sub")
    client = get_client()
    try:
        res = (
            client.table("daily_digests")
            .select("*")
            .eq("user_id", user_id)
            .order("digest_date", desc=True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        logger.warning(f"daily_digests not available: {e}")
        return None

    if not rows:
        return None
    r = rows[0]
    return {
        "digest_date": str(r.get("digest_date")),
        "stats": r.get("stats") or {},
        "highlights": r.get("highlights") or [],
        "generated_at": r.get("generated_at"),
    }


# ---------------------------------------------------------------------------
# Activity Streak
# ---------------------------------------------------------------------------

@router.get("/api/activity/streak")
def activity_streak() -> dict[str, Any]:
    """
    Last 30 days of activity levels + current & longest streak.
    Uses v_daily_activity (created by migration). Degrades to all-zero grid
    if view is missing.
    """
    client = get_client()
    today = date.today()
    start = today - timedelta(days=29)

    try:
        res = (
            client.table("v_daily_activity")
            .select("day, activity_level, touch_count")
            .gte("day", start.isoformat())
            .lte("day", today.isoformat())
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        logger.warning(f"v_daily_activity not available: {e}")
        rows = []

    by_day: dict[str, int] = {}
    for r in rows:
        day_val = r.get("day")
        day_str = str(day_val) if day_val else ""
        lvl = int(r.get("activity_level") or 0)
        by_day[day_str] = lvl

    days: list[dict] = []
    for i in range(30):
        d = start + timedelta(days=i)
        key = d.isoformat()
        days.append({"date": key, "level": by_day.get(key, 0)})

    # Current streak: consecutive non-zero days counting back from today.
    current_streak = 0
    for day_info in reversed(days):
        if day_info["level"] > 0:
            current_streak += 1
        else:
            break

    # Longest streak: simple scan. For a 30-day window this is cheap.
    longest = 0
    run = 0
    for day_info in days:
        if day_info["level"] > 0:
            run += 1
            longest = max(longest, run)
        else:
            run = 0

    return {
        "current_streak": current_streak,
        "longest_streak": longest,
        "days": days,
    }
