"""
Supabase Client — Core Database Access Layer
Single source of truth for all database operations.
"""

import os
from datetime import date, datetime
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client

from core.constants import PIPELINE_STAGES, STAGE_LABELS

load_dotenv()

# Re-export constants so existing `from core.supabase_client import PIPELINE_STAGES` works
__all__ = [
    "PIPELINE_STAGES", "STAGE_LABELS",
    "get_client", "get_leads", "get_lead_by_id", "upsert_lead", "get_lead_count",
    "get_pipeline_view", "set_lead_stage",
    "log_activity", "get_activities", "get_today_stats", "get_chart_data",
    "mark_lead_synced", "get_unsynced_leads", "update_email_engagement",
    "get_expenses", "add_expense", "delete_expense",
    "compute_lead_score",
    "get_notifications", "create_notification", "mark_notification_read", "mark_all_notifications_read",
    "search_leads",
]

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _client = create_client(url, key)
    return _client


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------

def get_leads(lead_type: str | None = None, lead_types: list[str] | None = None) -> list[dict]:
    """Get all leads, optionally filtered by lead_type(s), with their pipeline stage."""
    db = get_client()

    query = db.table("leads").select(
        "*, lead_stages(stage)"
    )
    if lead_types:
        query = query.in_("lead_type", lead_types)
    elif lead_type:
        query = query.eq("lead_type", lead_type)

    result = query.order("created_at", desc=True).execute()
    rows = result.data or []

    for row in rows:
        stage_data = row.pop("lead_stages", None)
        if isinstance(stage_data, list) and stage_data:
            row["stage"] = stage_data[0].get("stage", "new")
        elif isinstance(stage_data, dict):
            row["stage"] = stage_data.get("stage", "new")
        else:
            row["stage"] = "new"
        row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
        # Lead scoring
        scoring = compute_lead_score(row)
        row["lead_score"] = scoring["score"]
        row["lead_tier"] = scoring["tier"]

    return rows


def get_lead_by_id(lead_id: str) -> dict | None:
    """Get a single lead with stage and activity history."""
    db = get_client()

    result = db.table("leads").select(
        "*, lead_stages(stage)"
    ).eq("id", lead_id).single().execute()

    if not result.data:
        return None

    row = result.data
    stage_data = row.pop("lead_stages", None)
    if isinstance(stage_data, list) and stage_data:
        row["stage"] = stage_data[0].get("stage", "new")
    elif isinstance(stage_data, dict):
        row["stage"] = stage_data.get("stage", "new")
    else:
        row["stage"] = "new"
    row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
    scoring = compute_lead_score(row)
    row["lead_score"] = scoring["score"]
    row["lead_tier"] = scoring["tier"]

    # Attach activity history
    acts = db.table("activities").select("*").eq(
        "lead_id", lead_id
    ).order("created_at", desc=True).execute()
    row["activities"] = acts.data or []

    return row


def upsert_lead(lead_data: dict) -> dict:
    """
    Insert or update a lead. Deduplicates by email (case-insensitive) if email exists.
    Returns the upserted lead row.
    """
    db = get_client()

    # Normalise email if present
    if lead_data.get("email"):
        lead_data["email"] = lead_data["email"].strip().lower()
        # Try upsert with email deduplication
        try:
            result = db.table("leads").upsert(
                lead_data,
                on_conflict="email",
                ignore_duplicates=False,
            ).execute()
            return result.data[0] if result.data else lead_data
        except Exception:
            # Fallback: just insert
            pass

    # For leads without email, just insert as new row
    result = db.table("leads").insert(lead_data).execute()
    return result.data[0] if result.data else lead_data


def get_lead_count(
    country: str | None = None,
    industry: str | None = None,
    stage: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, int]:
    """Count leads per type, with optional filters."""
    db = get_client()
    query = db.table("leads").select("lead_type, created_at, country, industry, lead_stages(stage)")
    if country:
        query = query.ilike("country", f"%{country}%")
    if industry:
        query = query.ilike("industry", f"%{industry}%")
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)
    result = query.execute()
    rows = result.data or []

    # Apply stage filter in-memory (stage lives in lead_stages join)
    if stage:
        stage_lower = stage.lower()
        filtered = []
        for row in rows:
            sd = row.get("lead_stages")
            row_stage = "new"
            if isinstance(sd, list) and sd:
                row_stage = sd[0].get("stage", "new")
            elif isinstance(sd, dict):
                row_stage = sd.get("stage", "new")
            if row_stage == stage_lower:
                filtered.append(row)
        rows = filtered

    counts: dict[str, int] = {"company": 0, "contact": 0, "lead": 0, "total": 0}
    stage_counts: dict[str, int] = {s: 0 for s in PIPELINE_STAGES}
    for row in rows:
        t = row.get("lead_type", "lead")
        counts[t] = counts.get(t, 0) + 1
        counts["total"] += 1
        # Count by stage
        sd = row.get("lead_stages")
        row_stage = "new"
        if isinstance(sd, list) and sd:
            row_stage = sd[0].get("stage", "new")
        elif isinstance(sd, dict):
            row_stage = sd.get("stage", "new")
        stage_counts[row_stage] = stage_counts.get(row_stage, 0) + 1
    counts["stage_counts"] = stage_counts
    return counts


# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------

def get_pipeline_view(lead_type: str | None = None, lead_types: list[str] | None = None) -> dict:
    """All leads grouped by pipeline stage, optionally filtered by lead_type(s)."""
    from collections import defaultdict
    leads = get_leads(lead_type=lead_type, lead_types=lead_types)
    grouped: dict[str, list] = defaultdict(list)
    for lead in leads:
        grouped[lead["stage"]].append(lead)

    return {
        "stages": {stage: grouped.get(stage, []) for stage in PIPELINE_STAGES},
        "stage_counts": {stage: len(grouped.get(stage, [])) for stage in PIPELINE_STAGES},
        "stage_order": PIPELINE_STAGES,
        "stage_labels": STAGE_LABELS,
    }


def set_lead_stage(lead_id: str, stage: str) -> None:
    """Set or update the pipeline stage for a lead."""
    db = get_client()
    db.table("lead_stages").upsert(
        {"lead_id": lead_id, "stage": stage, "updated_at": datetime.now().isoformat()},
        on_conflict="lead_id",
    ).execute()


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

def log_activity(
    lead_id: str,
    activity_type: str,
    description: str = "",
) -> str:
    """Log an activity. Returns the new activity id."""
    db = get_client()
    result = db.table("activities").insert({
        "lead_id": lead_id,
        "activity_type": activity_type,
        "description": description,
        "created_at": datetime.now().isoformat(),
    }).execute()
    return result.data[0]["id"] if result.data else ""


def get_activities(
    lead_id: str | None = None,
    activity_type: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Query activities with optional filters."""
    db = get_client()
    query = db.table("activities").select("*")
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if activity_type:
        query = query.eq("activity_type", activity_type)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_today_stats(
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, int]:
    """Activity counts for a date range (defaults to today)."""
    db = get_client()
    if not date_from:
        today = date.today().isoformat()
        date_from = f"{today}T00:00:00"
        date_to = f"{today}T23:59:59"

    result = db.table("activities").select("activity_type").gte(
        "created_at", date_from
    ).lte("created_at", date_to or datetime.now().isoformat()).execute()

    rows = result.data or []
    stats: dict[str, int] = {}
    for row in rows:
        t = row.get("activity_type", "")
        stats[t] = stats.get(t, 0) + 1

    return {
        "emails_today": stats.get("email", 0),
        "calls_today": stats.get("call", 0),
        "outreaches_today": stats.get("email", 0) + stats.get("call", 0),
        "notes_today": stats.get("note", 0),
        "stage_changes_today": stats.get("stage_change", 0),
    }


def get_chart_data(days: int = 30) -> list[dict]:
    """Daily activity counts for the last N days."""
    db = get_client()
    from datetime import timedelta
    since = (datetime.now() - timedelta(days=days)).isoformat()

    result = db.table("activities").select(
        "activity_type, created_at"
    ).gte("created_at", since).execute()

    rows = result.data or []
    day_map: dict[str, dict] = {}
    for row in rows:
        d = row["created_at"][:10]  # YYYY-MM-DD
        if d not in day_map:
            day_map[d] = {"day": d, "emails": 0, "calls": 0, "notes": 0}
        atype = row.get("activity_type", "")
        if atype == "email":
            day_map[d]["emails"] += 1
        elif atype == "call":
            day_map[d]["calls"] += 1
        elif atype == "note":
            day_map[d]["notes"] += 1

    return sorted(day_map.values(), key=lambda x: x["day"])


# ---------------------------------------------------------------------------
# Instantly sync helpers
# ---------------------------------------------------------------------------

def mark_lead_synced(lead_id: str, campaign_id: str) -> None:
    """Mark a lead as synced to Instantly."""
    db = get_client()
    db.table("leads").update({
        "instantly_synced": True,
        "instantly_campaign_id": campaign_id,
    }).eq("id", lead_id).execute()


def get_unsynced_leads() -> list[dict]:
    """Get all leads not yet pushed to Instantly (with a valid email)."""
    db = get_client()
    result = db.table("leads").select("*").eq(
        "instantly_synced", False
    ).neq("email", "").not_.is_("email", "null").execute()
    return result.data or []


def update_email_engagement(
    email: str,
    event_type: str,  # open, reply, click, bounce
) -> None:
    """Update engagement counters on a lead from an Instantly webhook event."""
    db = get_client()
    email_lower = email.strip().lower()

    # Fetch current values
    result = db.table("leads").select(
        "id, email_opens, email_replies, email_clicks, email_bounced"
    ).ilike("email", email_lower).execute()

    if not result.data:
        return

    lead = result.data[0]
    updates: dict[str, Any] = {
        "last_email_event": event_type,
        "last_email_event_at": datetime.now().isoformat(),
    }

    if event_type == "open":
        updates["email_opens"] = (lead.get("email_opens") or 0) + 1
    elif event_type == "reply":
        updates["email_replies"] = (lead.get("email_replies") or 0) + 1
    elif event_type == "click":
        updates["email_clicks"] = (lead.get("email_clicks") or 0) + 1
    elif event_type == "bounce":
        updates["email_bounced"] = True

    db.table("leads").update(updates).eq("id", lead["id"]).execute()

    # Also log as an activity
    log_activity(lead["id"], f"email_{event_type}", f"Instantly: {event_type} event recorded")


# ---------------------------------------------------------------------------
# Expenses (Revenue Forecasting)
# ---------------------------------------------------------------------------

def get_expenses() -> list[dict]:
    """Get all expenses, ordered by created_at desc."""
    db = get_client()
    try:
        result = db.table("expenses").select("*").order("created_at", desc=True).execute()
        return result.data or []
    except Exception:
        # Table may not exist yet
        return []


def add_expense(name: str, category: str, amount: float, period: str = "monthly") -> dict:
    """Insert a new expense record."""
    db = get_client()
    result = db.table("expenses").insert({
        "name": name,
        "category": category,
        "amount": amount,
        "period": period,
    }).execute()
    return (result.data or [{}])[0]


def delete_expense(expense_id: str) -> None:
    """Delete an expense by ID."""
    db = get_client()
    db.table("expenses").delete().eq("id", expense_id).execute()


# ---------------------------------------------------------------------------
# Lead Scoring
# ---------------------------------------------------------------------------

def compute_lead_score(lead: dict) -> dict:
    """Compute a 0-100 score and hot/warm/cold tier for a lead."""
    score = 0

    # Email engagement
    score += min((lead.get("email_opens") or 0) * 5, 25)
    score += min((lead.get("email_replies") or 0) * 15, 30)
    score += min((lead.get("email_clicks") or 0) * 10, 20)

    # Stage progression
    stage_scores = {
        "new": 0, "researched": 5, "email_sent": 10,
        "follow_up_1": 12, "follow_up_2": 14, "responded": 25,
        "meeting": 40, "proposal": 60, "free_trial": 75,
        "closed_won": 100, "closed_lost": 0,
    }
    # Get stage from lead_stages relation or direct field
    lead_stage = lead.get("stage", "new")
    if not lead_stage:
        stages_data = lead.get("lead_stages")
        if isinstance(stages_data, list) and stages_data:
            lead_stage = stages_data[0].get("stage", "new")
        elif isinstance(stages_data, dict):
            lead_stage = stages_data.get("stage", "new")
    score += stage_scores.get(lead_stage, 0)

    # Bounced penalty
    if lead.get("email_bounced"):
        score = max(score - 20, 0)

    score = min(score, 100)

    if score >= 60:
        tier = "hot"
    elif score >= 30:
        tier = "warm"
    else:
        tier = "cold"

    return {"score": score, "tier": tier}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def get_notifications(unread_only: bool = False, limit: int = 20) -> list[dict]:
    """Get notifications, optionally filtered to unread only."""
    db = get_client()
    try:
        query = db.table("notifications").select("*")
        if unread_only:
            query = query.eq("read", False)
        result = query.order("created_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception:
        return []


def create_notification(type: str, title: str, message: str = "", lead_id: str | None = None) -> None:
    """Insert a notification."""
    db = get_client()
    try:
        data: dict = {"type": type, "title": title, "message": message}
        if lead_id:
            data["lead_id"] = lead_id
        db.table("notifications").insert(data).execute()
    except Exception:
        pass


def mark_notification_read(notification_id: str) -> None:
    """Mark a single notification as read."""
    db = get_client()
    try:
        db.table("notifications").update({"read": True}).eq("id", notification_id).execute()
    except Exception:
        pass


def mark_all_notifications_read() -> None:
    """Mark all notifications as read."""
    db = get_client()
    try:
        db.table("notifications").update({"read": True}).eq("read", False).execute()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_leads(query: str, limit: int = 10) -> list[dict]:
    """Search leads by name, email, or company using ilike."""
    db = get_client()
    q = f"%{query.strip().lower()}%"

    result = db.table("leads").select(
        "id, lead_type, email, full_name, first_name, last_name, company_name, "
        "email_opens, email_replies, email_clicks, email_bounced, lead_stages(stage)"
    ).or_(
        f"full_name.ilike.{q},email.ilike.{q},company_name.ilike.{q},first_name.ilike.{q},last_name.ilike.{q}"
    ).limit(limit).execute()

    rows = result.data or []
    for row in rows:
        stage_data = row.pop("lead_stages", None)
        if isinstance(stage_data, list) and stage_data:
            row["stage"] = stage_data[0].get("stage", "new")
        elif isinstance(stage_data, dict):
            row["stage"] = stage_data.get("stage", "new")
        else:
            row["stage"] = "new"
        scoring = compute_lead_score(row)
        row["lead_score"] = scoring["score"]
        row["lead_tier"] = scoring["tier"]

    return rows
