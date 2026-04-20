"""
Supabase Client — Core Database Access Layer
Single source of truth for all database operations.
"""

import os
import re
from datetime import date, datetime
from difflib import SequenceMatcher
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client

from core.constants import PIPELINE_STAGES, STAGE_LABELS

load_dotenv()

# Re-export constants so existing `from core.supabase_client import PIPELINE_STAGES` works
__all__ = [
    "PIPELINE_STAGES", "STAGE_LABELS",
    "get_client", "get_leads", "get_lead_by_id", "upsert_lead", "get_lead_count",
    "get_company_data", "get_people_data", "get_company_employees",
    "get_companies", "get_company_detail",
    "get_pipeline_leads", "get_pipeline_view", "set_lead_stage",
    "log_activity", "get_activities", "get_today_stats", "get_chart_data",
    "mark_lead_synced", "get_unsynced_leads", "update_email_engagement",
    "get_expenses", "add_expense", "update_expense", "delete_expense",
    "compute_lead_score",
    "get_notifications", "create_notification", "mark_notification_read", "mark_all_notifications_read",
    "register_user_device", "unregister_user_device",
    "search_leads",
    "set_lead_email_platform", "bulk_set_email_platform",
    "_normalize_company_name", "_normalize_linkedin", "_normalize_phone", "_build_name_key",
    # Email module helpers
    "get_email_accounts", "get_email_account_by_email",
    "create_email_account", "update_email_account",
    "get_platform_connections", "upsert_platform_connection", "delete_platform_connection",
    "upsert_sync_snapshot", "get_today_snapshots",
    "upsert_analytics_daily", "get_analytics_today",
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

def get_leads() -> list[dict]:
    """Get all records with their pipeline stage.
    Paginates internally to bypass Supabase's 1000-row default limit."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0

    while True:
        query = db.table("leads").select("*, lead_stages(stage)")
        result = query.order("created_at", desc=True).range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    for row in rows:
        _attach_stage_and_score(row)

    return rows


def get_company_data() -> list[dict]:
    """Records where company_name is populated."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0

    while True:
        result = (
            db.table("leads").select("*, lead_stages(stage)")
            .neq("company_name", "")
            .not_.is_("company_name", "null")
            .order("created_at", desc=True)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    for row in rows:
        _attach_stage_and_score(row)
    return rows


def get_people_data() -> list[dict]:
    """Records where first_name or full_name is populated."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0

    while True:
        result = (
            db.table("leads").select("*, lead_stages(stage)")
            .or_("first_name.neq.,full_name.neq.")
            .order("created_at", desc=True)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    for row in rows:
        _attach_stage_and_score(row)
    return rows


def get_company_employees(company_name: str) -> list[dict]:
    """Get all person records that belong to a given company_name."""
    if not company_name:
        return []
    db = get_client()
    result = (
        db.table("leads").select("*, lead_stages(stage)")
        .ilike("company_name", company_name)
        .or_("first_name.neq.,full_name.neq.")
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []
    for row in rows:
        _attach_stage_and_score(row)
    return rows


def _attach_stage_and_score(row: dict) -> None:
    """Extract stage from lead_stages join and compute lead score.
    Also surfaces stage_updated_at so the frontend can compute heat dots
    (days-since-last-touch) without an extra round-trip."""
    stage_data = row.pop("lead_stages", None)
    stage_updated_at = None
    if isinstance(stage_data, list) and stage_data:
        row["stage"] = stage_data[0].get("stage", "new")
        stage_updated_at = stage_data[0].get("updated_at")
    elif isinstance(stage_data, dict):
        row["stage"] = stage_data.get("stage", "new")
        stage_updated_at = stage_data.get("updated_at")
    else:
        row["stage"] = "new"
    row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
    if stage_updated_at is not None:
        row["stage_updated_at"] = stage_updated_at
    scoring = compute_lead_score(row)
    row["lead_score"] = scoring["score"]
    if not row.get("lead_tier"):
        row["lead_tier"] = scoring["tier"]


def get_lead_by_id(lead_id: str) -> dict | None:
    """Get a single record with stage and activity history."""
    db = get_client()

    result = db.table("leads").select(
        "*, lead_stages(stage)"
    ).eq("id", lead_id).single().execute()

    if not result.data:
        return None

    row = result.data
    _attach_stage_and_score(row)

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
        # Try insert first; if duplicate email exists, update the existing row
        try:
            result = db.table("leads").insert(lead_data).execute()
            return result.data[0] if result.data else lead_data
        except Exception as e:
            err_str = str(e)
            if "23505" in err_str or "duplicate" in err_str.lower():
                # Duplicate email — update the existing row instead
                email = lead_data.pop("email")
                update_data = {k: v for k, v in lead_data.items() if v not in (None, "")}
                if update_data:
                    result = (
                        db.table("leads")
                        .update(update_data)
                        .ilike("email", email)
                        .execute()
                    )
                    return result.data[0] if result.data else {**lead_data, "email": email}
                return {**lead_data, "email": email}
            raise

    # For leads without email, try to match by LinkedIn, phone, or name+company
    existing_row = None

    linkedin = (lead_data.get("linkedin") or "").strip()
    phone = (lead_data.get("phone") or "").strip()

    if linkedin:
        norm_li = _normalize_linkedin(linkedin)
        if norm_li and "linkedin.com" in norm_li:
            res = db.table("leads").select("*").ilike("linkedin", f"%{norm_li}%").limit(1).execute()
            if res.data:
                existing_row = res.data[0]

    if not existing_row and phone:
        norm_phone = _normalize_phone(phone)
        if len(norm_phone) >= 7:
            res = db.table("leads").select("*").ilike("phone", f"%{norm_phone[-7:]}%").execute()
            for row in (res.data or []):
                if _normalize_phone(row.get("phone") or "") == norm_phone:
                    existing_row = row
                    break

    if not existing_row:
        name = _build_name_key(
            lead_data.get("first_name", ""),
            lead_data.get("last_name", ""),
            lead_data.get("full_name", ""),
        )
        company = _normalize_company_name(lead_data.get("company_name", ""))
        if name and company:
            res = db.table("leads").select("*").ilike("company_name", f"%{company[:10]}%").execute()
            for row in (res.data or []):
                row_name = _build_name_key(
                    row.get("first_name", ""),
                    row.get("last_name", ""),
                    row.get("full_name", ""),
                )
                row_company = _normalize_company_name(row.get("company_name", ""))
                if (row_name and row_company
                        and SequenceMatcher(None, name, row_name).ratio() >= 0.85
                        and SequenceMatcher(None, company, row_company).ratio() >= 0.85):
                    existing_row = row
                    break

    if existing_row:
        update_data = {k: v for k, v in lead_data.items() if v not in (None, "") and not existing_row.get(k)}
        if update_data:
            result = db.table("leads").update(update_data).eq("id", existing_row["id"]).execute()
            return result.data[0] if result.data else {**existing_row, **update_data}
        return existing_row

    # Truly new lead — no match found
    result = db.table("leads").insert(lead_data).execute()
    return result.data[0] if result.data else lead_data


def get_lead_count(
    country: str | None = None,
    industry: str | None = None,
    stage: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, int]:
    """Count records by data presence, with optional filters.
    Paginates internally to bypass Supabase's 1000-row default limit."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0

    while True:
        query = db.table("leads").select(
            "company_name, first_name, full_name, created_at, country, industry, lead_stages(stage)"
        )
        if country:
            query = query.ilike("country", f"%{country}%")
        if industry:
            query = query.ilike("industry", f"%{industry}%")
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        result = query.range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

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

    with_company = 0
    with_person = 0
    stage_counts: dict[str, int] = {s: 0 for s in PIPELINE_STAGES}
    for row in rows:
        if row.get("company_name"):
            with_company += 1
        if row.get("first_name") or row.get("full_name"):
            with_person += 1
        sd = row.get("lead_stages")
        row_stage = "new"
        if isinstance(sd, list) and sd:
            row_stage = sd[0].get("stage", "new")
        elif isinstance(sd, dict):
            row_stage = sd.get("stage", "new")
        stage_counts[row_stage] = stage_counts.get(row_stage, 0) + 1

    counts = {
        "total": len(rows),
        "with_company": with_company,
        "with_person": with_person,
        "stage_counts": stage_counts,
    }
    return counts


# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------

# Minimal fields needed to render a LeadCard — skips raw_data, notes, social fields, etc.
_PIPELINE_SELECT = (
    "id,full_name,first_name,last_name,company_name,industry,"
    "email,title,created_at,updated_at,last_email_event_at,lead_tier,"
    "lead_stages(stage,updated_at)"
)


def get_pipeline_leads() -> list[dict]:
    """Lightweight lead fetch for pipeline view — minimal fields only.
    Much faster than get_leads() because it skips ~30 heavy fields per row."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = (
            db.table("leads")
            .select(_PIPELINE_SELECT)
            .order("created_at", desc=True)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    for row in rows:
        _attach_stage_and_score(row)
    return rows


def get_pipeline_view() -> dict:
    """All records grouped by pipeline stage."""
    from collections import defaultdict
    leads = get_pipeline_leads()
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
    """Activity counts for a date range (defaults to today).

    Also pulls emails_sent from Instantly.ai so that the dashboard
    Outreaches card reflects real outreach volume, not just manual logs.
    """
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

    # Pull Instantly.ai sent email count for the same date range
    instantly_emails = 0
    try:
        from integrations.esp.instantly import fetch_analytics_overview
        # Extract just the date portion (YYYY-MM-DD) for the Instantly API
        sd = date_from[:10] if date_from else None
        ed = date_to[:10] if date_to else None
        overview = fetch_analytics_overview(start_date=sd, end_date=ed)
        if "error" not in overview:
            instantly_emails = overview.get("emails_sent", 0)
    except Exception:
        pass  # Don't let Instantly failure break the dashboard

    manual_emails = stats.get("email", 0)
    calls = stats.get("call", 0)

    return {
        "emails_today": manual_emails + instantly_emails,
        "calls_today": calls,
        "outreaches_today": manual_emails + instantly_emails + calls,
        "instantly_emails": instantly_emails,
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
# Email module helpers — email_accounts, platform_connections,
# email_sync_snapshots, email_analytics_daily
# ---------------------------------------------------------------------------

def get_email_accounts() -> list[dict]:
    """
    Return all email accounts with their platform connections joined in.
    Each account dict includes a 'connections' list.
    """
    db = get_client()
    accounts = db.table("email_accounts").select("*").order("email").execute().data or []
    if not accounts:
        return []

    account_ids = [a["id"] for a in accounts]
    conns = (
        db.table("platform_connections")
        .select("*")
        .in_("email_account_id", account_ids)
        .eq("is_active", True)
        .execute()
        .data or []
    )

    # Index connections by account id
    conn_map: dict[str, list] = {}
    for c in conns:
        conn_map.setdefault(c["email_account_id"], []).append(c)

    for a in accounts:
        a["connections"] = conn_map.get(a["id"], [])

    return accounts


def get_email_account_by_email(email_str: str) -> dict | None:
    """Lookup a single email_account row by email address (case-insensitive)."""
    db = get_client()
    result = (
        db.table("email_accounts")
        .select("*")
        .ilike("email", email_str.strip().lower())
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def create_email_account(email: str, global_daily_limit: int, warmup_score: int | None = None) -> dict:
    """Insert a new email account. Returns the created row."""
    db = get_client()
    payload: dict[str, Any] = {
        "email": email.strip().lower(),
        "global_daily_limit": global_daily_limit,
    }
    if warmup_score is not None:
        payload["warmup_score"] = warmup_score
    result = db.table("email_accounts").insert(payload).execute()
    return result.data[0]


def update_email_account(account_id: str, updates: dict) -> dict:
    """Update fields on an email_account row. Returns the updated row."""
    db = get_client()
    result = db.table("email_accounts").update(updates).eq("id", account_id).execute()
    return result.data[0]


def get_platform_connections(email_account_id: str) -> list[dict]:
    """Return all active platform connections for a given email account."""
    db = get_client()
    return (
        db.table("platform_connections")
        .select("*")
        .eq("email_account_id", email_account_id)
        .eq("is_active", True)
        .execute()
        .data or []
    )


def upsert_platform_connection(
    email_account_id: str,
    platform: str,
    allocated_daily_limit: int,
    platform_account_id: str | None = None,
) -> dict:
    """
    Insert or update a platform_connection row.
    Uses ON CONFLICT (email_account_id, platform) DO UPDATE.
    """
    db = get_client()
    payload: dict[str, Any] = {
        "email_account_id": email_account_id,
        "platform": platform,
        "allocated_daily_limit": allocated_daily_limit,
        "is_active": True,
    }
    if platform_account_id is not None:
        payload["platform_account_id"] = platform_account_id

    result = db.table("platform_connections").upsert(
        payload, on_conflict="email_account_id,platform"
    ).execute()
    return result.data[0]


def delete_platform_connection(connection_id: str) -> None:
    """Soft-delete a platform connection by marking it inactive."""
    db = get_client()
    db.table("platform_connections").update({"is_active": False}).eq("id", connection_id).execute()


def upsert_sync_snapshot(
    email_account_id: str,
    platform: str,
    sync_date: str,          # ISO date string: "2025-04-01"
    metrics: dict,           # keys: sent, opened, clicked, replied, bounced, unsubscribed
) -> dict:
    """
    Upsert one row in email_sync_snapshots.
    If a row for (account, platform, date) already exists it is overwritten
    with the latest numbers from the platform API.
    """
    db = get_client()
    payload: dict[str, Any] = {
        "email_account_id": email_account_id,
        "platform": platform,
        "sync_date": sync_date,
        "synced_at": datetime.now().isoformat(),
        "sent": metrics.get("sent", 0),
        "opened": metrics.get("opened", 0),
        "clicked": metrics.get("clicked", 0),
        "replied": metrics.get("replied", 0),
        "bounced": metrics.get("bounced", 0),
        "unsubscribed": metrics.get("unsubscribed", 0),
    }
    result = db.table("email_sync_snapshots").upsert(
        payload, on_conflict="email_account_id,platform,sync_date"
    ).execute()
    return result.data[0]


def get_today_snapshots() -> list[dict]:
    """Return all email_sync_snapshots rows for today (UTC)."""
    db = get_client()
    today = date.today().isoformat()
    return (
        db.table("email_sync_snapshots")
        .select("*")
        .eq("sync_date", today)
        .execute()
        .data or []
    )


def upsert_analytics_daily(
    email_account_id: str,
    analytics_date: str,      # ISO date string
    data: dict,               # keys: total_sent, total_opened, … rates … global_limit, total_allocated, remaining
) -> dict:
    """
    Upsert one row in email_analytics_daily.
    Called by the sync service after aggregating all platform snapshots.
    """
    db = get_client()
    payload: dict[str, Any] = {
        "email_account_id": email_account_id,
        "analytics_date": analytics_date,
        "computed_at": datetime.now().isoformat(),
        **data,
    }
    result = db.table("email_analytics_daily").upsert(
        payload, on_conflict="email_account_id,analytics_date"
    ).execute()
    return result.data[0]


def get_analytics_today() -> list[dict]:
    """Return all email_analytics_daily rows for today (UTC)."""
    db = get_client()
    today = date.today().isoformat()
    return (
        db.table("email_analytics_daily")
        .select("*")
        .eq("analytics_date", today)
        .execute()
        .data or []
    )


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


def add_expense(
    name: str,
    category: str,
    base_amount: float,
    tax: float,
    commission: float,
    period: str = "monthly",
    original_usd: float | None = None,
    payment_date: str | None = None,
) -> dict:
    """Insert a new expense record with INR breakdown."""
    db = get_client()
    total_inr = base_amount + tax + commission
    row: dict[str, Any] = {
        "name": name,
        "category": category,
        "base_amount": base_amount,
        "tax": tax,
        "commission": commission,
        "total_inr": total_inr,
        "amount": total_inr,  # backward compat for mobile
        "period": period,
    }
    if original_usd is not None:
        row["original_usd"] = original_usd
    if payment_date is not None:
        row["payment_date"] = payment_date
    result = db.table("expenses").insert(row).execute()
    return (result.data or [{}])[0]


def update_expense(expense_id: str, updates: dict) -> dict:
    """Update an existing expense. Recomputes total_inr if cost fields change."""
    db = get_client()
    cost_fields = {"base_amount", "tax", "commission"}
    if cost_fields & updates.keys():
        current = db.table("expenses").select(
            "base_amount, tax, commission"
        ).eq("id", expense_id).single().execute()
        if current.data:
            base = updates.get("base_amount", current.data["base_amount"])
            tax = updates.get("tax", current.data["tax"])
            comm = updates.get("commission", current.data["commission"])
            updates["total_inr"] = base + tax + comm
            updates["amount"] = updates["total_inr"]  # backward compat
    result = db.table("expenses").update(updates).eq("id", expense_id).execute()
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
    """Insert a notification row AND fan out push (FCM) to registered devices."""
    db = get_client()
    try:
        data: dict = {"type": type, "title": title, "message": message}
        if lead_id:
            data["lead_id"] = lead_id
        db.table("notifications").insert(data).execute()
    except Exception:
        pass

    # Fan out to FCM tokens. Never let push failures break the notification.
    try:
        from integrations.push.fcm import send_to_tokens, is_configured
        if not is_configured():
            return
        tokens_result = db.table("user_devices").select("fcm_token").execute()
        tokens = [r.get("fcm_token") for r in (tokens_result.data or []) if r.get("fcm_token")]
        if tokens:
            payload = {"type": type}
            if lead_id:
                payload["lead_id"] = lead_id
            dispatch = send_to_tokens(tokens, title, message, payload)
            # Clean up tokens the FCM service says are invalid.
            for bad in dispatch.get("invalid_tokens", []):
                try:
                    db.table("user_devices").delete().eq("fcm_token", bad).execute()
                except Exception:
                    pass
    except Exception:
        pass


# ---------------------------------------------------------------------------
# User devices (for FCM push)
# ---------------------------------------------------------------------------

def register_user_device(user_id: str, fcm_token: str, platform: str = "android") -> None:
    """Upsert a device token for a user. Deduplicates by (user_id, fcm_token)."""
    db = get_client()
    try:
        db.table("user_devices").upsert(
            {"user_id": user_id, "fcm_token": fcm_token, "platform": platform},
            on_conflict="user_id,fcm_token",
        ).execute()
    except Exception:
        pass


def unregister_user_device(fcm_token: str) -> None:
    """Remove a device token (e.g. on logout)."""
    db = get_client()
    try:
        db.table("user_devices").delete().eq("fcm_token", fcm_token).execute()
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
# Email Platform Assignment
# ---------------------------------------------------------------------------

def set_lead_email_platform(lead_id: str, platform: str | None) -> dict:
    """Assign (or clear) the email_platform field on a single lead."""
    db = get_client()
    result = db.table("leads").update({"email_platform": platform}).eq("id", lead_id).execute()
    return (result.data or [{}])[0]


def bulk_set_email_platform(lead_ids: list[str], platform: str | None) -> int:
    """Assign the email_platform to a list of lead IDs. Returns count updated."""
    if not lead_ids:
        return 0
    db = get_client()
    # Supabase Python client supports .in_() for filtering
    result = db.table("leads").update({"email_platform": platform}).in_("id", lead_ids).execute()
    return len(result.data or [])


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_leads(query: str, limit: int = 10) -> list[dict]:
    """Search leads by name, email, or company using ilike."""
    db = get_client()
    q = f"%{query.strip().lower()}%"

    result = db.table("leads").select(
        "id, email, full_name, first_name, last_name, company_name, "
        "email_opens, email_replies, email_clicks, email_bounced, lead_stages(stage)"
    ).or_(
        f"full_name.ilike.{q},email.ilike.{q},company_name.ilike.{q},first_name.ilike.{q},last_name.ilike.{q}"
    ).limit(limit).execute()

    rows = result.data or []
    for row in rows:
        _attach_stage_and_score(row)

    return rows


# ---------------------------------------------------------------------------
# Lead-Company Linking
# ---------------------------------------------------------------------------

_COMPANY_SUFFIXES = re.compile(
    r"\b(inc|llc|ltd|corp|corporation|pvt|pty|limited|co|company|group|holdings|gmbh|ag|sa|srl)\b\.?",
    re.IGNORECASE,
)


def _normalize_company_name(name: str) -> str:
    """Lowercase, strip whitespace, remove common corporate suffixes."""
    if not name:
        return ""
    n = name.strip().lower()
    n = _COMPANY_SUFFIXES.sub("", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def _normalize_linkedin(url: str) -> str:
    """Normalize a LinkedIn URL for comparison.
    'https://www.linkedin.com/in/john-doe-123/' → 'linkedin.com/in/john-doe-123'
    """
    if not url or not isinstance(url, str):
        return ""
    url = url.strip().lower()
    for prefix in ("https://", "http://", "www."):
        if url.startswith(prefix):
            url = url[len(prefix):]
    url = url.split("?")[0]  # strip query params
    return url.rstrip("/")


def _normalize_phone(phone: str) -> str:
    """Strip all non-digit characters for comparison.
    '+971 55 548 7793' → '971555487793'
    """
    if not phone or not isinstance(phone, str):
        return ""
    return re.sub(r"\D", "", phone.strip())


def _build_name_key(first_name: str = "", last_name: str = "", full_name: str = "") -> str:
    """Build a normalized name key for fuzzy matching.
    ('Dr. Shahram', 'Nabili', '') → 'shahram nabili'
    """
    if full_name and full_name.strip():
        name = full_name.strip().lower()
    else:
        parts = [p.strip() for p in (first_name, last_name) if p and p.strip()]
        name = " ".join(parts).lower()
    if not name:
        return ""
    # Remove common prefixes/suffixes
    name = re.sub(r"\b(dr|mr|mrs|ms|prof|sir|md|phd|dds|dmd)\b\.?", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name



# (Company linking functions removed — unified data model, no separate company records)


# ---------------------------------------------------------------------------
# Normalized Companies (post-migration)
# ---------------------------------------------------------------------------

def get_companies() -> list[dict]:
    """Return all companies from company_list_view (deduplicated, with counts)."""
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = (
            db.table("company_list_view")
            .select("*")
            .order("name", desc=False)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def get_company_detail(company_id: str) -> dict | None:
    """Return a single company with its locations and contacts (grouped)."""
    db = get_client()

    # Company base record
    res = db.table("companies").select("*").eq("id", company_id).single().execute()
    if not res.data:
        return None
    company = res.data

    # Locations
    loc_res = (
        db.table("locations")
        .select("*")
        .eq("company_id", company_id)
        .order("city", desc=False)
        .execute()
    )
    locations = loc_res.data or []

    # Contacts for this company
    ct_res = (
        db.table("contacts")
        .select("*")
        .eq("company_id", company_id)
        .order("full_name", desc=False)
        .execute()
    )
    contacts = ct_res.data or []

    # Attach contacts to their locations
    loc_map: dict[str, dict] = {loc["id"]: {**loc, "leads": []} for loc in locations}
    unattached: list[dict] = []
    for contact in contacts:
        loc_id = contact.get("location_id")
        if loc_id and loc_id in loc_map:
            loc_map[loc_id]["leads"].append(contact)
        else:
            unattached.append(contact)

    company["locations"] = list(loc_map.values())
    company["leads"] = contacts        # flat list for "All Leads" table
    company["location_count"] = len(locations)
    company["lead_count"] = len(contacts)
    return company


# ---------------------------------------------------------------------------
# Email Module Helpers
# ---------------------------------------------------------------------------

def get_email_accounts() -> list[dict]:
    """Return all email accounts with their platform_connections."""
    db = get_client()
    accounts = db.table("email_accounts").select("*, platform_connections(*)").order("email").execute()
    return accounts.data or []


def get_email_account_by_email(email_str: str) -> dict | None:
    """Lookup a single email account by address."""
    db = get_client()
    res = db.table("email_accounts").select("*, platform_connections(*)").eq("email", email_str).execute()
    return res.data[0] if res.data else None


def create_email_account(email: str, global_daily_limit: int = 100, warmup_score: int | None = None) -> dict:
    """Insert a new email account. Raises on duplicate email."""
    db = get_client()
    payload: dict = {"email": email, "global_daily_limit": global_daily_limit}
    if warmup_score is not None:
        payload["warmup_score"] = warmup_score
    res = db.table("email_accounts").insert(payload).execute()
    return res.data[0]


def update_email_account(account_id: str, updates: dict) -> dict | None:
    """Partial update on an email account row."""
    db = get_client()
    res = db.table("email_accounts").update(updates).eq("id", account_id).execute()
    return res.data[0] if res.data else None


def get_platform_connections(email_account_id: str) -> list[dict]:
    """Return all platform_connections for a given account."""
    db = get_client()
    res = (
        db.table("platform_connections")
        .select("*")
        .eq("email_account_id", email_account_id)
        .execute()
    )
    return res.data or []


def upsert_platform_connection(
    email_account_id: str,
    platform: str,
    allocated_daily_limit: int,
    platform_account_id: str | None = None,
    is_active: bool = True,
) -> dict:
    """Create or update a platform_connection row (upsert on email_account_id + platform)."""
    db = get_client()
    payload = {
        "email_account_id": email_account_id,
        "platform": platform,
        "allocated_daily_limit": allocated_daily_limit,
        "is_active": is_active,
    }
    if platform_account_id is not None:
        payload["platform_account_id"] = platform_account_id
    res = db.table("platform_connections").upsert(payload, on_conflict="email_account_id,platform").execute()
    return res.data[0]


def delete_platform_connection(connection_id: str) -> bool:
    """Delete a single platform_connection by id."""
    db = get_client()
    db.table("platform_connections").delete().eq("id", connection_id).execute()
    return True


def upsert_sync_snapshot(
    email_account_id: str,
    platform: str,
    sync_date: str,
    metrics: dict,
) -> dict:
    """Upsert daily snapshot (email_account_id + platform + sync_date unique)."""
    db = get_client()
    payload = {
        "email_account_id": email_account_id,
        "platform": platform,
        "sync_date": sync_date,
        **metrics,
    }
    res = (
        db.table("email_sync_snapshots")
        .upsert(payload, on_conflict="email_account_id,platform,sync_date")
        .execute()
    )
    return res.data[0]


def get_today_snapshots() -> list[dict]:
    """All email_sync_snapshots for today."""
    db = get_client()
    today = date.today().isoformat()
    res = db.table("email_sync_snapshots").select("*").eq("sync_date", today).execute()
    return res.data or []


def upsert_analytics_daily(email_account_id: str, analytics_date: str, aggregated: dict) -> dict:
    """Upsert pre-computed daily analytics (email_account_id + analytics_date unique)."""
    db = get_client()
    payload = {
        "email_account_id": email_account_id,
        "analytics_date": analytics_date,
        "computed_at": datetime.utcnow().isoformat(),
        **aggregated,
    }
    res = (
        db.table("email_analytics_daily")
        .upsert(payload, on_conflict="email_account_id,analytics_date")
        .execute()
    )
    return res.data[0]


def get_analytics_today() -> list[dict]:
    """All email_analytics_daily rows for today."""
    db = get_client()
    today = date.today().isoformat()
    res = (
        db.table("email_analytics_daily")
        .select("*, email_accounts(email, global_daily_limit)")
        .eq("analytics_date", today)
        .execute()
    )
    return res.data or []


# ---------------------------------------------------------------------------
# Sync log helpers
# ---------------------------------------------------------------------------

def insert_sync_log(record: dict) -> dict:
    """Insert a new sync log row. Returns the created row with its id."""
    db = get_client()
    res = db.table("instantly_sync_log").insert(record).execute()
    return res.data[0] if res.data else {}


def update_sync_log(log_id: str, updates: dict) -> dict:
    """Update an existing sync log row by id."""
    db = get_client()
    res = (
        db.table("instantly_sync_log")
        .update(updates)
        .eq("id", log_id)
        .execute()
    )
    return res.data[0] if res.data else {}


def get_sync_logs(limit: int = 20) -> list[dict]:
    """Return the most recent sync log entries, newest first."""
    db = get_client()
    res = (
        db.table("instantly_sync_log")
        .select("*")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


# ---------------------------------------------------------------------------
# Open Intelligence — email_open_events + email_template_tags helpers
# ---------------------------------------------------------------------------

COUNTRY_TIMEZONE_MAP: dict[str, str] = {
    "poland": "Europe/Warsaw",
    "spain": "Europe/Madrid",
    "germany": "Europe/Berlin",
    "france": "Europe/Paris",
    "italy": "Europe/Rome",
    "netherlands": "Europe/Amsterdam",
    "united kingdom": "Europe/London",
    "uk": "Europe/London",
    "usa": "America/New_York",
    "united states": "America/New_York",
}


def _derive_lead_local(event: dict) -> dict:
    """Derive opened_at_lead_local from lead_country if not already set."""
    if event.get("opened_at_lead_local"):
        return event
    country = (event.get("lead_country") or "").lower().strip()
    tz_name = COUNTRY_TIMEZONE_MAP.get(country)
    if not tz_name:
        return event
    try:
        import pytz
        from datetime import datetime
        tz = pytz.timezone(tz_name)
        raw = event["opened_at"]
        utc_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        local_dt = utc_dt.astimezone(tz)
        event = dict(event)
        event["opened_at_lead_local"] = local_dt.isoformat()
        event["lead_timezone"] = tz_name
    except Exception:
        pass
    return event


def upsert_open_event(event: dict) -> dict:
    """
    Upsert a single open event into email_open_events.
    Derives opened_at_lead_local from lead_country at write time using pytz.
    Conflict target: (lead_email, campaign_id, step_number, variant_id, opened_at).
    """
    db = get_client()
    event = _derive_lead_local(event)
    res = (
        db.table("email_open_events")
        .upsert(event, on_conflict="lead_email,campaign_id,step_number,variant_id,opened_at")
        .execute()
    )
    return res.data[0] if res.data else {}


def get_open_events(
    date_from: str | None = None,
    date_to: str | None = None,
    campaign_id: str | None = None,
    country: str | None = None,
    specialty: str | None = None,
    limit: int = 2000,
) -> list[dict]:
    """Query email_open_events with optional filters."""
    db = get_client()
    q = db.table("email_open_events").select("*")
    if date_from:
        q = q.gte("opened_at", date_from)
    if date_to:
        q = q.lte("opened_at", date_to + "T23:59:59Z")
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    if country:
        q = q.ilike("lead_country", country)
    if specialty:
        q = q.ilike("lead_specialty", specialty)
    res = q.order("opened_at", desc=True).limit(limit).execute()
    return res.data or []


def get_template_tags(campaign_id: str | None = None) -> list[dict]:
    """Return email_template_tags rows, optionally filtered by campaign."""
    db = get_client()
    q = db.table("email_template_tags").select("*")
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    return q.order("step_number").execute().data or []


def upsert_template_tag(tag: dict) -> dict:
    """Upsert an email_template_tags row. Conflict on (campaign_id, step_number, variant_id)."""
    db = get_client()
    res = (
        db.table("email_template_tags")
        .upsert(tag, on_conflict="campaign_id,step_number,variant_id")
        .execute()
    )
    return res.data[0] if res.data else {}


def update_template_tag(tag_id: str, updates: dict) -> dict:
    """Update an existing email_template_tags row by id."""
    db = get_client()
    res = (
        db.table("email_template_tags")
        .update(updates)
        .eq("id", tag_id)
        .execute()
    )
    return res.data[0] if res.data else {}


def delete_template_tag(tag_id: str) -> bool:
    """Delete an email_template_tags row by id."""
    get_client().table("email_template_tags").delete().eq("id", tag_id).execute()
    return True


def get_hot_leads(min_reopens: int = 3) -> list[dict]:
    """
    Return leads whose open_number >= min_reopens on any single email,
    indicating high engagement (multiple re-opens).
    """
    db = get_client()
    res = (
        db.table("email_open_events")
        .select(
            "lead_email, campaign_id, campaign_name, step_number, "
            "variant_id, subject_line, lead_country, lead_specialty, open_number"
        )
        .gte("open_number", min_reopens)
        .order("open_number", desc=True)
        .limit(100)
        .execute()
    )
    return res.data or []
