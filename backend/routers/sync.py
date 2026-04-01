"""Sync endpoints (campaign listing, preview & lead push to Instantly)."""

from fastapi import APIRouter

from core.supabase_client import get_unsynced_leads, get_client
from integrations.instantly import invalidate_cache
from tools.lead_ingestion import get_campaigns_for_selection, _push_to_instantly
from backend.schemas import SyncPushRequest

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/preview")
def sync_preview():
    """Show unsynced leads that can be pushed to Instantly."""
    try:
        unsynced = get_unsynced_leads()

        # Count total leads with email and already-synced leads
        db = get_client()
        total_result = db.table("leads").select(
            "id", count="exact"
        ).neq("email", "").not_.is_("email", "null").execute()
        total_with_email = total_result.count or 0

        synced_result = db.table("leads").select(
            "id", count="exact"
        ).eq("instantly_synced", True).execute()
        already_synced = synced_result.count or 0

        # Build contact preview list
        missing_contacts = []
        for lead in unsynced:
            missing_contacts.append({
                "email": lead.get("email", ""),
                "first_name": lead.get("first_name", ""),
                "last_name": lead.get("last_name", ""),
                "company": lead.get("company_name", ""),
                "title": lead.get("title") or lead.get("job_title", ""),
                "phone": lead.get("phone", ""),
                "linkedin": lead.get("linkedin", ""),
                "notes": lead.get("notes", ""),
                "valid": bool(lead.get("email")),
            })

        return {
            "missing_contacts": missing_contacts,
            "excel_total": total_with_email,
            "instantly_total": already_synced + len(unsynced),
            "already_synced": already_synced,
            "missing_count": len(unsynced),
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


@router.get("/campaigns")
def sync_campaigns():
    return get_campaigns_for_selection()


@router.post("/push")
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
