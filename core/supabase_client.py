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
    "get_pipeline_view", "set_lead_stage",
    "log_activity", "get_activities", "get_today_stats", "get_chart_data",
    "mark_lead_synced", "get_unsynced_leads", "update_email_engagement",
    "get_expenses", "add_expense", "update_expense", "delete_expense",
    "compute_lead_score",
    "get_notifications", "create_notification", "mark_notification_read", "mark_all_notifications_read",
    "search_leads",
    "_normalize_company_name", "_normalize_linkedin", "_normalize_phone", "_build_name_key",
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
    """Extract stage from lead_stages join and compute lead score."""
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

def get_pipeline_view() -> dict:
    """All records grouped by pipeline stage."""
    from collections import defaultdict
    leads = get_leads()
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
