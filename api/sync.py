"""Sync & Instantly webhook endpoints."""

import logging
import re
from datetime import datetime, timezone as _tz

from fastapi import APIRouter, HTTPException, Request

from core.supabase_client import (
    update_email_engagement,
    get_unsynced_leads,
    upsert_open_event,
    get_client as _get_db,
)
from integrations.esp.instantly import invalidate_cache, fetch_all_leads
from services.lead_ingestion import get_campaigns_for_selection, _push_to_instantly
from api.schemas import SyncPushRequest

_log = logging.getLogger("sync")


def _is_valid_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))

router = APIRouter(tags=["sync"])


@router.get("/api/sync/campaigns")
def sync_campaigns():
    return get_campaigns_for_selection()


@router.get("/api/sync/preview")
def sync_preview():
    """Compare Supabase unsynced leads against Instantly to find missing contacts."""
    try:
        # Leads in Supabase not yet pushed
        unsynced = get_unsynced_leads()
        excel_total = len(unsynced)

        # Leads already in Instantly (fetch up to 20 pages / 2000 leads)
        instantly_leads = fetch_all_leads(max_pages=20)
        instantly_emails = {
            l.get("email", "").lower().strip()
            for l in instantly_leads
            if l.get("email")
        }
        instantly_total = len(instantly_emails)

        # Missing = unsynced Supabase leads whose email isn't in Instantly yet
        missing = []
        for lead in unsynced:
            email = (lead.get("email") or "").lower().strip()
            if not email or email in instantly_emails:
                continue
            missing.append({
                "email": lead.get("email", ""),
                "first_name": lead.get("first_name", ""),
                "last_name": lead.get("last_name", ""),
                "company": lead.get("company_name", ""),
                "title": lead.get("title", ""),
                "phone": lead.get("phone", ""),
                "linkedin": lead.get("linkedin", ""),
                "notes": lead.get("notes", ""),
                "valid": _is_valid_email(lead.get("email", "")),
            })

        return {
            "missing_contacts": missing,
            "excel_total": excel_total,
            "instantly_total": instantly_total,
            "already_synced": excel_total - len(missing),
            "missing_count": len(missing),
            "error": None,
        }
    except Exception as e:
        return {
            "missing_contacts": [],
            "excel_total": 0,
            "instantly_total": 0,
            "already_synced": 0,
            "missing_count": 0,
            "error": str(e),
        }


@router.post("/api/sync/push")
def sync_push(body: SyncPushRequest):
    """Push unsynced Supabase leads to an Instantly campaign."""
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


@router.post("/api/webhooks/instantly")
async def instantly_webhook(request: Request):
    """
    Receives webhook events from Instantly.ai.
    Updates lead engagement data in Supabase.
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

    # --- Open Intelligence: dual-write to email_open_events on every open ---
    if our_event == "open":
        try:
            step_number = int(
                payload.get("step_number")
                or payload.get("sequence_step")
                or 1
            )
            variant_id = str(
                payload.get("variant_id")
                or payload.get("variant")
                or "A"
            )
            opened_at = (
                payload.get("opened_at")
                or payload.get("timestamp")
                or datetime.now(_tz.utc).isoformat()
            )
            campaign_id = payload.get("campaign_id", "")

            # Count previous opens to derive open_number (which re-open is this?)
            existing = (
                _get_db()
                .table("email_open_events")
                .select("id", count="exact")
                .eq("lead_email", email.lower())
                .eq("campaign_id", campaign_id)
                .eq("step_number", step_number)
                .eq("variant_id", variant_id)
                .execute()
            )
            open_number = (existing.count or 0) + 1

            event_row = {
                "lead_email":     email.lower(),
                "campaign_id":    campaign_id,
                "campaign_name":  payload.get("campaign_name"),
                "step_number":    step_number,
                "variant_id":     variant_id,
                "subject_line":   payload.get("subject") or payload.get("subject_line"),
                "opened_at":      opened_at,
                "open_number":    open_number,
                "lead_country":   payload.get("lead_country") or payload.get("country"),
                "lead_specialty": payload.get("lead_specialty") or payload.get("specialty"),
                "device_type":    payload.get("device_type") or "unknown",
                "raw_event_data": payload,
            }
            upsert_open_event(event_row)
        except Exception as exc:
            _log.warning("open_event upsert failed (webhook continues): %s", exc)
    # -------------------------------------------------------------------------

    update_email_engagement(email, our_event)

    return {"status": "ok", "event": our_event, "email": email}
