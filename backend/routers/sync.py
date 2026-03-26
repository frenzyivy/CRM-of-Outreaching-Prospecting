"""Sync & Instantly webhook endpoints."""

from fastapi import APIRouter, HTTPException, Request

from core.supabase_client import update_email_engagement, get_unsynced_leads
from integrations.instantly import invalidate_cache
from tools.lead_ingestion import get_campaigns_for_selection, _push_to_instantly
from backend.schemas import SyncPushRequest

router = APIRouter(tags=["sync"])


@router.get("/api/sync/campaigns")
def sync_campaigns():
    return get_campaigns_for_selection()


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

    update_email_engagement(email, our_event)

    return {"status": "ok", "event": our_event, "email": email}
