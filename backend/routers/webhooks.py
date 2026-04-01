"""Webhook endpoints for external services (NO JWT auth — these are called by third-party servers)."""

from fastapi import APIRouter, HTTPException, Request

from core.supabase_client import update_email_engagement, get_client, log_activity, create_notification
from integrations.whatsapp import verify_webhook

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/instantly")
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


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """Receive incoming WhatsApp messages and status updates."""
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


@router.get("/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Verify webhook subscription from Meta."""
    mode = request.query_params.get("hub.mode", "")
    token = request.query_params.get("hub.verify_token", "")
    challenge = request.query_params.get("hub.challenge", "")

    result = verify_webhook(mode, token, challenge)
    if result:
        return int(result)
    raise HTTPException(status_code=403, detail="Verification failed")
