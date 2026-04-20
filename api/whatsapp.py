"""WhatsApp Business API endpoints."""

from fastapi import APIRouter, HTTPException, Request

from core.supabase_client import get_client, log_activity, create_notification
from integrations.esp.whatsapp import send_text_message, is_configured, verify_webhook
from api.schemas import WhatsAppSendRequest

router = APIRouter(tags=["whatsapp"])


@router.post("/api/whatsapp/send")
def whatsapp_send(body: WhatsAppSendRequest):
    """Send a WhatsApp text message (within 24h window) or initiate via template."""
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


@router.get("/api/whatsapp/conversations/{lead_id}")
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


@router.get("/api/whatsapp/analytics")
def whatsapp_analytics():
    """Get WhatsApp messaging metrics."""
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


@router.post("/api/webhooks/whatsapp")
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


@router.get("/api/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Verify webhook subscription from Meta."""
    mode = request.query_params.get("hub.mode", "")
    token = request.query_params.get("hub.verify_token", "")
    challenge = request.query_params.get("hub.challenge", "")

    result = verify_webhook(mode, token, challenge)
    if result:
        return int(result)
    raise HTTPException(status_code=403, detail="Verification failed")
