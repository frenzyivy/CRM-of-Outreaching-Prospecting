"""
AI Medical CRM — FastAPI Backend (Supabase Edition)
Entry point: uvicorn server:app --reload
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools.supabase_client import (
    get_client,
    get_leads,
    get_lead_by_id,
    get_lead_count,
    get_pipeline_view,
    set_lead_stage,
    log_activity,
    get_activities,
    get_today_stats,
    get_chart_data,
    update_email_engagement,
    PIPELINE_STAGES,
    STAGE_LABELS,
)
from tools.lead_ingestion import ingest_file, get_campaigns_for_selection
from tools.instantly import get_all_instantly_data, fetch_daily_analytics, invalidate_cache
from tools.folder_watcher import start_watcher, scan_existing

load_dotenv()

logger = logging.getLogger("server")


# --- Lifespan (startup / shutdown) ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — verify Supabase connection
    try:
        get_client()
        logger.info("Supabase connected.")
    except Exception as e:
        logger.error(f"Supabase connection failed: {e}")

    # Process any files already sitting in /imports
    scan_existing()

    # Start the folder watcher in a background thread
    observer = start_watcher()

    yield

    # Shutdown
    observer.stop()
    observer.join()


app = FastAPI(title="AI Medical CRM", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class StageUpdate(BaseModel):
    stage: str
    description: str = ""

class ActivityCreate(BaseModel):
    lead_id: str
    activity_type: str  # email, call, note
    description: str = ""

class SyncPushRequest(BaseModel):
    campaign_id: str
    lead_emails: list[str] | None = None


# =========================================================================
# Dashboard
# =========================================================================

@app.get("/api/dashboard/stats")
def dashboard_stats(
    date_range: str = Query(default="This Month"),
    country: str = Query(default="All"),
    company_type: str = Query(default="All"),
    pipeline_stage: str = Query(default="All"),
):
    from datetime import date as dt_date, timedelta

    # Resolve date range to date_from / date_to
    today = dt_date.today()
    date_from = None
    date_to = f"{today.isoformat()}T23:59:59"

    if date_range == "Today":
        date_from = f"{today.isoformat()}T00:00:00"
    elif date_range == "This Week":
        start = today - timedelta(days=today.weekday())  # Monday
        date_from = f"{start.isoformat()}T00:00:00"
    elif date_range == "This Month":
        start = today.replace(day=1)
        date_from = f"{start.isoformat()}T00:00:00"
    # "Custom" or unrecognized → no date filter (all time)

    # Map "All" to None for filters
    country_filter = None if country == "All" else country
    industry_filter = None if company_type == "All" else company_type
    stage_filter = None if pipeline_stage == "All" else pipeline_stage

    counts = get_lead_count(
        country=country_filter,
        industry=industry_filter,
        stage=stage_filter,
        date_from=date_from,
        date_to=date_to,
    )
    activity_stats = get_today_stats(date_from=date_from, date_to=date_to)

    stage_counts = counts.get("stage_counts", {})
    total = counts["total"]

    # Compute derived metrics from real data
    outreach_stages = sum(
        stage_counts.get(s, 0)
        for s in ["email_sent", "follow_up_1", "follow_up_2", "responded",
                   "meeting", "proposal", "closed_won", "closed_lost"]
    )
    responded_plus = sum(
        stage_counts.get(s, 0)
        for s in ["responded", "meeting", "proposal", "closed_won"]
    )
    response_rate = round((responded_plus / outreach_stages * 100), 1) if outreach_stages else 0
    conversion_rate = round((stage_counts.get("closed_won", 0) / total * 100), 1) if total else 0

    # Free trial = leads in "free_trial" stage
    free_trial_count = stage_counts.get("free_trial", 0)

    # Clients (Paid) = closed_won
    clients_paid = stage_counts.get("closed_won", 0)

    # Conversion: outreach → free trial
    outreach_to_trial = round((free_trial_count / outreach_stages * 100), 1) if outreach_stages else 0

    return {
        "total_leads": total,
        "total_companies": counts["company"],
        "total_contacts": counts["contact"],
        "meetings_count": stage_counts.get("meeting", 0),
        "proposals_count": stage_counts.get("proposal", 0),
        "closed_won_count": stage_counts.get("closed_won", 0),
        "closed_lost_count": stage_counts.get("closed_lost", 0),
        "response_rate": response_rate,
        "conversion_rate": conversion_rate,
        "free_trial_count": free_trial_count,
        "clients_paid": clients_paid,
        "outreach_to_trial": outreach_to_trial,
        "revenue_generated": 0,
        "total_spent": 0,
        "stage_counts": stage_counts,
        **activity_stats,
    }


@app.get("/api/dashboard/needs-attention")
def dashboard_needs_attention():
    """Return leads that need attention: unreplied, stale deals, bounced emails."""
    from datetime import datetime, timedelta

    db_client = get_client()
    items = []

    # 1. Bounced emails
    try:
        bounced = db_client.table("leads").select(
            "id, email, full_name, first_name, last_name, company_name, last_email_event_at"
        ).eq("email_bounced", True).limit(20).execute()
        for row in bounced.data or []:
            name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
            items.append({
                "id": row["id"],
                "type": "bounced",
                "lead_name": name,
                "email": row.get("email", ""),
                "detail": f"Email bounced — {row.get('company_name', 'Unknown company')}",
                "days_ago": 0,
            })
    except Exception:
        pass

    # 2. Stale deals — leads in meeting/proposal stage with no recent activity (7+ days)
    try:
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        for stage in ["meeting", "proposal"]:
            stale = db_client.table("leads").select(
                "id, email, full_name, first_name, last_name, company_name, lead_stages!inner(stage, updated_at)"
            ).eq("lead_stages.stage", stage).lt("lead_stages.updated_at", cutoff).limit(10).execute()
            for row in stale.data or []:
                name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                stage_data = row.get("lead_stages", {})
                updated = stage_data.get("updated_at", "") if isinstance(stage_data, dict) else ""
                days = 0
                if updated:
                    try:
                        days = (datetime.now() - datetime.fromisoformat(updated.replace("Z", "+00:00").replace("+00:00", ""))).days
                    except Exception:
                        days = 7
                items.append({
                    "id": row["id"],
                    "type": "stale",
                    "lead_name": name,
                    "email": row.get("email", ""),
                    "detail": f"In {stage} stage for {days}+ days — {row.get('company_name', '')}",
                    "days_ago": days,
                })
    except Exception:
        pass

    # 3. Unreplied — leads in email_sent/follow_up stages with no reply (3+ days)
    try:
        cutoff = (datetime.now() - timedelta(days=3)).isoformat()
        for stage in ["email_sent", "follow_up_1", "follow_up_2"]:
            unreplied = db_client.table("leads").select(
                "id, email, full_name, first_name, last_name, company_name, email_replies, lead_stages!inner(stage, updated_at)"
            ).eq("lead_stages.stage", stage).lt("lead_stages.updated_at", cutoff).limit(10).execute()
            for row in unreplied.data or []:
                if (row.get("email_replies") or 0) > 0:
                    continue
                name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                items.append({
                    "id": row["id"],
                    "type": "unreplied",
                    "lead_name": name,
                    "email": row.get("email", ""),
                    "detail": f"No reply after {stage.replace('_', ' ')} — {row.get('company_name', '')}",
                    "days_ago": 3,
                })
    except Exception:
        pass

    # Sort: bounced first, then stale, then unreplied
    priority = {"bounced": 0, "stale": 1, "unreplied": 2}
    items.sort(key=lambda x: (priority.get(x["type"], 9), -x["days_ago"]))

    return {"items": items[:30], "total": len(items)}


@app.get("/api/dashboard/chart-data")
def dashboard_chart_data(days: int = Query(default=30, ge=1, le=365)):
    return get_chart_data(days)


# =========================================================================
# Leads
# =========================================================================

@app.get("/api/leads/companies")
def list_companies():
    return get_leads(lead_type="company")


@app.get("/api/leads/contacts")
def list_contacts():
    return get_leads(lead_type="contact")


@app.get("/api/leads/leads")
def list_leads():
    return get_leads(lead_type="lead")


@app.get("/api/leads/{lead_type}/{lead_id}")
def get_lead(lead_type: str, lead_id: str):
    if lead_type not in ("company", "contact", "lead"):
        raise HTTPException(status_code=400, detail="lead_type must be 'company', 'contact', or 'lead'")
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


# =========================================================================
# Pipeline
# =========================================================================

@app.get("/api/pipeline")
def pipeline(lead_type: str | None = None):
    # "contact" tab should show both 'contact' and 'lead' type records (people)
    if lead_type == "contact":
        return get_pipeline_view(lead_types=["contact", "lead"])
    return get_pipeline_view(lead_type=lead_type)


@app.put("/api/pipeline/{lead_type}/{lead_id}/stage")
def update_stage(lead_type: str, lead_id: str, body: StageUpdate):
    if body.stage not in PIPELINE_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Must be one of: {PIPELINE_STAGES}",
        )
    set_lead_stage(lead_id, body.stage)
    log_activity(lead_id, "stage_change", body.description or f"Stage changed to {body.stage}")
    return {"status": "ok", "stage": body.stage}


# =========================================================================
# Activities
# =========================================================================

@app.post("/api/activities")
def create_activity(body: ActivityCreate):
    if body.activity_type not in ("email", "call", "note"):
        raise HTTPException(status_code=400, detail="activity_type must be email, call, or note")

    activity_id = log_activity(body.lead_id, body.activity_type, body.description)
    return {"status": "ok", "activity_id": activity_id}


@app.get("/api/activities")
def list_activities(
    lead_id: str | None = None,
    activity_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
):
    return get_activities(lead_id, activity_type, limit)


# =========================================================================
# Lead Import (CSV/Excel drag-drop from UI)
# =========================================================================

@app.post("/api/leads/import")
async def import_leads(
    file: UploadFile = File(...),
    campaign_id: str | None = Query(default=None, description="Instantly campaign to auto-push new leads to"),
):
    """
    Upload a CSV or Excel file to ingest leads.
    - Deduplicates by email
    - Inserts new leads into Supabase
    - Optionally auto-pushes to an Instantly.ai campaign
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    result = ingest_file(
        file_bytes=contents,
        filename=file.filename or "upload.csv",
        source="csv_upload",
        auto_push_campaign_id=campaign_id,
    )
    return result


# =========================================================================
# Revenue & Expenses
# =========================================================================

class ExpenseCreate(BaseModel):
    name: str
    category: str = "tool"  # tool, api, salary, other
    amount: float
    period: str = "monthly"  # monthly, yearly, one-time


@app.get("/api/revenue/summary")
def revenue_summary():
    """Return revenue, expenses, and computed ROI."""
    from tools.supabase_client import get_expenses

    expenses = get_expenses()
    tool_spend = sum(e["amount"] for e in expenses if e.get("category") == "tool")
    api_spend = sum(e["amount"] for e in expenses if e.get("category") == "api")
    other_spend = sum(e["amount"] for e in expenses if e.get("category") not in ("tool", "api"))
    total_spent = tool_spend + api_spend + other_spend

    # Revenue from closed_won deals (placeholder — extend with deal_value when available)
    revenue_generated = 0

    roi = round(((revenue_generated - total_spent) / total_spent * 100), 1) if total_spent else 0
    profit_loss = revenue_generated - total_spent

    return {
        "revenue_generated": revenue_generated,
        "total_spent": total_spent,
        "tool_spend": tool_spend,
        "api_spend": api_spend,
        "other_spend": other_spend,
        "roi": roi,
        "profit_loss": profit_loss,
        "expenses": expenses,
    }


@app.post("/api/revenue/expenses")
def add_expense(body: ExpenseCreate):
    from tools.supabase_client import add_expense as db_add_expense

    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if body.category not in ("tool", "api", "salary", "other"):
        raise HTTPException(status_code=400, detail="Invalid category")

    result = db_add_expense(body.name, body.category, body.amount, body.period)
    return {"status": "ok", "expense": result}


@app.delete("/api/revenue/expenses/{expense_id}")
def delete_expense(expense_id: str):
    from tools.supabase_client import delete_expense as db_delete_expense

    db_delete_expense(expense_id)
    return {"status": "ok"}


# =========================================================================
# Instantly.ai Email
# =========================================================================

@app.get("/api/email/overview")
def email_overview():
    data = get_all_instantly_data()
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "error": data.get("error"),
    }


@app.get("/api/email/daily")
def email_daily(campaign_id: str | None = None, days: int = Query(default=30, ge=1, le=90)):
    data = get_all_instantly_data()
    return {
        "daily": data.get("daily", []),
        "error": data.get("error"),
    }


@app.get("/api/email/countries")
def email_countries():
    data = get_all_instantly_data()
    return {
        "country_stats": data.get("country_stats", []),
        "error": data.get("error"),
    }


@app.get("/api/email/leads")
def email_leads():
    data = get_all_instantly_data()
    return {
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "error": data.get("error"),
    }


@app.get("/api/email/refresh")
def email_refresh():
    data = get_all_instantly_data(force=True)
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "daily": data.get("daily", []),
        "country_stats": data.get("country_stats", []),
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "error": data.get("error"),
    }


# =========================================================================
# Supabase → Instantly Sync
# =========================================================================

@app.get("/api/sync/campaigns")
def sync_campaigns():
    return get_campaigns_for_selection()


@app.post("/api/sync/push")
def sync_push(body: SyncPushRequest):
    """Push unsynced Supabase leads to an Instantly campaign."""
    from tools.supabase_client import get_unsynced_leads
    from tools.lead_ingestion import _push_to_instantly

    unsynced = get_unsynced_leads()
    if not unsynced:
        return {"pushed": 0, "skipped": 0, "failed": 0, "errors": ["No unsynced leads."]}

    if body.lead_emails is not None:
        selected = {e.lower().strip() for e in body.lead_emails}
        unsynced = [l for l in unsynced if l.get("email", "").lower().strip() in selected]

    if not unsynced:
        return {"pushed": 0, "skipped": 0, "failed": 0, "errors": ["No matching leads to push."]}

    lead_ids = [l["id"] for l in unsynced]
    pushed, errors = _push_to_instantly(lead_ids, body.campaign_id)
    invalidate_cache()

    return {"pushed": pushed, "failed": len(lead_ids) - pushed, "errors": errors}


# =========================================================================
# Instantly.ai Webhook (two-way sync: opens/replies/bounces → Supabase)
# =========================================================================

@app.post("/api/webhooks/instantly")
async def instantly_webhook(request: Request):
    """
    Receives webhook events from Instantly.ai.
    Updates lead engagement data in Supabase.

    Configure in Instantly → Settings → Webhooks:
        URL: https://your-server.com/api/webhooks/instantly
        Events: email_opened, email_replied, email_bounced, link_clicked
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("event_type", "").lower()
    email = (
        payload.get("lead_email")
        or payload.get("email")
        or payload.get("to_email")
        or ""
    )

    if not email:
        return {"status": "ignored", "reason": "no email in payload"}

    event_map = {
        "email_opened": "open",
        "email_replied": "reply",
        "email_bounced": "bounce",
        "link_clicked": "click",
        "open": "open",
        "reply": "reply",
        "bounce": "bounce",
        "click": "click",
    }

    our_event = event_map.get(event_type)
    if not our_event:
        return {"status": "ignored", "reason": f"unknown event_type: {event_type}"}

    update_email_engagement(email, our_event)

    return {"status": "ok", "event": our_event, "email": email}


# =========================================================================
# Integrations — credential management (writes to .env, never returns values)
# =========================================================================

# Whitelist: integration_id → the exact env-var keys it owns
INTEGRATION_ENV_KEYS: dict[str, list[str]] = {
    # ── Already active ──
    "instantly":      ["INSTANTLY_API_KEY"],
    "supabase":       ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"],
    # ── Analytics ──
    "ga4":            ["GA4_MEASUREMENT_ID", "GA4_API_SECRET"],
    "google_search":  ["GSC_CLIENT_ID", "GSC_CLIENT_SECRET"],
    "mixpanel":       ["MIXPANEL_PROJECT_TOKEN", "MIXPANEL_API_SECRET"],
    "heap":           ["HEAP_APP_ID"],
    "hotjar":         ["HOTJAR_SITE_ID", "HOTJAR_API_KEY"],
    "segment":        ["SEGMENT_WRITE_KEY"],
    # ── Data & Enrichment ──
    "apollo":         ["APOLLO_API_KEY"],
    "clay":           ["CLAY_API_KEY"],
    "zoominfo":       ["ZOOMINFO_USERNAME", "ZOOMINFO_PASSWORD"],
    "linkedin":       ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    "hunter":         ["HUNTER_API_KEY"],
    "clearbit":       ["CLEARBIT_API_KEY"],
    "lusha":          ["LUSHA_API_KEY"],
    "snovio":         ["SNOVIO_USER_ID", "SNOVIO_API_SECRET"],
    "datagma":        ["DATAGMA_API_KEY"],
    "dropcontact":    ["DROPCONTACT_API_KEY"],
    "wiza":           ["WIZA_API_KEY"],
    "kaspr":          ["KASPR_API_KEY"],
    "phantombuster":  ["PHANTOMBUSTER_API_KEY"],
    # ── Email Outreach ──
    "lemlist":        ["LEMLIST_API_KEY"],
    "smartlead":      ["SMARTLEAD_API_KEY"],
    "woodpecker":     ["WOODPECKER_API_KEY"],
    "reply":          ["REPLY_API_KEY"],
    "mailshake":      ["MAILSHAKE_API_KEY"],
    # ── WhatsApp & Calls ──
    "whatsapp":       ["WHATSAPP_PHONE_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_VERIFY_TOKEN"],
    "retell":         ["RETELL_API_KEY"],
    # ── CRM ──
    "hubspot":        ["HUBSPOT_ACCESS_TOKEN"],
    "salesforce":     ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET",
                       "SALESFORCE_USERNAME", "SALESFORCE_PASSWORD"],
    "pipedrive":      ["PIPEDRIVE_API_TOKEN"],
    "close":          ["CLOSE_API_KEY"],
}


def _env_path() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def _read_env_file() -> dict[str, str]:
    result: dict[str, str] = {}
    path = _env_path()
    if not os.path.exists(path):
        return result
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            result[key.strip()] = val.strip()
    return result


def _write_env_keys(updates: dict[str, str]) -> None:
    """Update existing keys in-place; append new ones at the end.
    Preserves all comments, blank lines, and key ordering."""
    path = _env_path()
    lines: list[str] = []
    if os.path.exists(path):
        with open(path, "r") as f:
            lines = f.readlines()

    written: set[str] = set()
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}\n")
            written.add(key)
        else:
            new_lines.append(line)

    for key, val in updates.items():
        if key not in written:
            new_lines.append(f"{key}={val}\n")

    with open(path, "w") as f:
        f.writelines(new_lines)


class IntegrationConnectRequest(BaseModel):
    integration_id: str
    credentials: dict[str, str]

class IntegrationDisconnectRequest(BaseModel):
    integration_id: str


@app.get("/api/integrations/status")
def integrations_status():
    """Return which integrations are connected. Credential values are NEVER returned."""
    env = _read_env_file()
    result: dict[str, dict] = {}
    for int_id, keys in INTEGRATION_ENV_KEYS.items():
        result[int_id] = {
            "connected": all(env.get(k, "").strip() for k in keys),
            "partial": any(env.get(k, "").strip() for k in keys),
        }
    return result


@app.post("/api/integrations/connect")
def integration_connect(body: IntegrationConnectRequest):
    """Save credentials to .env. Only whitelisted keys per integration are accepted."""
    allowed = INTEGRATION_ENV_KEYS.get(body.integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {body.integration_id}")

    to_write: dict[str, str] = {}
    for key, val in body.credentials.items():
        if key not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Key '{key}' is not allowed for '{body.integration_id}'. "
                       f"Allowed keys: {allowed}",
            )
        if val.strip():
            to_write[key] = val.strip()

    if not to_write:
        raise HTTPException(status_code=400, detail="No credentials provided.")

    _write_env_keys(to_write)
    # Reload into os.environ so the running process picks them up immediately
    for k, v in to_write.items():
        os.environ[k] = v

    return {
        "status": "ok",
        "integration_id": body.integration_id,
        "keys_written": list(to_write.keys()),
    }


@app.get("/api/integrations/{integration_id}/credentials")
def integration_credentials(integration_id: str):
    """Return masked credential values for a connected integration.
    Each value is returned as '***' with the last 4 chars visible (e.g. '***x1a2b').
    This lets the UI pre-fill fields so the user knows a value is set,
    without leaking the actual secret."""
    allowed = INTEGRATION_ENV_KEYS.get(integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {integration_id}")
    env = _read_env_file()
    result: dict[str, str] = {}
    for key in allowed:
        val = env.get(key, "").strip()
        if val:
            # Show last 4 chars so user knows which credential is set
            suffix = val[-4:] if len(val) >= 4 else val
            result[key] = f"***{suffix}"
        else:
            result[key] = ""
    return result


@app.post("/api/integrations/disconnect")
def integration_disconnect(body: IntegrationDisconnectRequest):
    """Clear an integration's credentials from .env (sets values to empty string)."""
    allowed = INTEGRATION_ENV_KEYS.get(body.integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {body.integration_id}")

    _write_env_keys({k: "" for k in allowed})
    for k in allowed:
        os.environ.pop(k, None)

    return {"status": "ok", "integration_id": body.integration_id}


# =========================================================================
# WhatsApp Business API
# =========================================================================

class WhatsAppSendRequest(BaseModel):
    to_phone: str
    message: str
    lead_id: str | None = None


@app.post("/api/whatsapp/send")
def whatsapp_send(body: WhatsAppSendRequest):
    """Send a WhatsApp text message (within 24h window) or initiate via template."""
    from tools.whatsapp import send_text_message, is_configured
    from tools.supabase_client import log_activity

    if not is_configured():
        raise HTTPException(status_code=400, detail="WhatsApp Business API not configured")

    try:
        result = send_text_message(body.to_phone, body.message)
        msg_id = (result.get("messages") or [{}])[0].get("id", "")

        # Log as activity if lead_id provided
        if body.lead_id:
            log_activity(body.lead_id, "whatsapp", f"WhatsApp sent: {body.message[:80]}")

        # Store message in whatsapp_messages table
        try:
            db = get_client()
            db.table("whatsapp_messages").insert({
                "lead_id": body.lead_id,
                "phone": body.to_phone,
                "direction": "outbound",
                "content": body.message,
                "status": "sent",
                "wa_message_id": msg_id,
            }).execute()
        except Exception:
            pass

        return {"status": "ok", "message_id": msg_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/whatsapp/conversations/{lead_id}")
def whatsapp_conversations(lead_id: str):
    """Get WhatsApp message history for a lead."""
    db = get_client()
    try:
        result = db.table("whatsapp_messages").select("*").eq(
            "lead_id", lead_id
        ).order("created_at", desc=False).execute()
        return result.data or []
    except Exception:
        return []


@app.get("/api/whatsapp/analytics")
def whatsapp_analytics():
    """Get WhatsApp messaging metrics."""
    from tools.whatsapp import is_configured

    if not is_configured():
        return {"configured": False, "total_sent": 0, "total_received": 0, "conversations": 0}

    db = get_client()
    try:
        result = db.table("whatsapp_messages").select("direction").execute()
        rows = result.data or []
        sent = sum(1 for r in rows if r.get("direction") == "outbound")
        received = sum(1 for r in rows if r.get("direction") == "inbound")
        return {
            "configured": True,
            "total_sent": sent,
            "total_received": received,
            "conversations": len(set(r.get("lead_id") for r in rows if r.get("lead_id"))),
        }
    except Exception:
        return {"configured": True, "total_sent": 0, "total_received": 0, "conversations": 0}


@app.post("/api/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    """Receive incoming WhatsApp messages and status updates."""
    from tools.supabase_client import create_notification

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Process incoming messages
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                phone = msg.get("from", "")
                text = msg.get("text", {}).get("body", "")
                wa_id = msg.get("id", "")

                # Store inbound message
                try:
                    db = get_client()
                    # Find lead by phone
                    lead_result = db.table("leads").select("id").eq("phone", phone).limit(1).execute()
                    lead_id = (lead_result.data or [{}])[0].get("id") if lead_result.data else None

                    db.table("whatsapp_messages").insert({
                        "lead_id": lead_id,
                        "phone": phone,
                        "direction": "inbound",
                        "content": text,
                        "status": "received",
                        "wa_message_id": wa_id,
                    }).execute()

                    # Create notification
                    create_notification(
                        "whatsapp_reply",
                        f"WhatsApp reply from {phone}",
                        text[:100],
                        lead_id,
                    )
                except Exception:
                    pass

    return {"status": "ok"}


@app.get("/api/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Verify webhook subscription from Meta."""
    from tools.whatsapp import verify_webhook

    mode = request.query_params.get("hub.mode", "")
    token = request.query_params.get("hub.verify_token", "")
    challenge = request.query_params.get("hub.challenge", "")

    result = verify_webhook(mode, token, challenge)
    if result:
        return int(result)
    raise HTTPException(status_code=403, detail="Verification failed")


# =========================================================================
# Notifications
# =========================================================================

@app.get("/api/notifications")
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
):
    from tools.supabase_client import get_notifications
    return get_notifications(unread_only=unread_only, limit=limit)


@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    from tools.supabase_client import mark_notification_read as db_mark_read
    db_mark_read(notification_id)
    return {"status": "ok"}


@app.put("/api/notifications/read-all")
def mark_all_notifications_read():
    from tools.supabase_client import mark_all_notifications_read as db_mark_all_read
    db_mark_all_read()
    return {"status": "ok"}


# =========================================================================
# Search
# =========================================================================

@app.get("/api/search")
def search_leads_endpoint(q: str = Query(default="", min_length=1), limit: int = Query(default=10, ge=1, le=50)):
    from tools.supabase_client import search_leads
    return search_leads(q, limit)


# =========================================================================
# Health
# =========================================================================

@app.get("/api/health")
def health():
    try:
        counts = get_lead_count()
        return {
            "status": "healthy",
            "database": "supabase",
            "companies_count": counts["company"],
            "contacts_count": counts["contact"],
            "leads_count": counts["lead"],
            "total": counts["total"],
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
