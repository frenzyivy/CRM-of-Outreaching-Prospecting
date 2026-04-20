"""Leads API endpoints."""

import logging

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from core.constants import EMAIL_PLATFORMS
from core.supabase_client import (
    get_leads,
    get_lead_by_id,
    get_company_data,
    get_people_data,
    get_company_employees,
    set_lead_email_platform,
    bulk_set_email_platform,
)
from services.lead_ingestion import ingest_file

logger = logging.getLogger("leads")

router = APIRouter(prefix="/api/leads", tags=["leads"])


# ---------------------------------------------------------------------------
# Platform assignment request bodies
# ---------------------------------------------------------------------------

class EmailPlatformRequest(BaseModel):
    platform: str | None = None


class BulkEmailPlatformRequest(BaseModel):
    lead_ids: list[str]
    platform: str | None = None


@router.get("/company-view")
def list_company_view():
    """Records with company_name populated."""
    return get_company_data()


@router.get("/people-view")
def list_people_view():
    """Records with person name (first_name/full_name) populated."""
    return get_people_data()


@router.get("")
def list_all():
    """All records."""
    return get_leads()


@router.get("/company/{company_name}/employees")
def list_company_employees(company_name: str):
    """All person records sharing this company_name."""
    from urllib.parse import unquote
    return get_company_employees(unquote(company_name))


@router.patch("/{lead_id}/email-platform")
def set_lead_platform(lead_id: str, body: EmailPlatformRequest):
    """Assign or clear the email_platform on a single lead."""
    if body.platform and body.platform not in EMAIL_PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform. Choose from: {list(EMAIL_PLATFORMS.keys())}",
        )
    result = set_lead_email_platform(lead_id, body.platform)
    return {"status": "ok", "lead_id": lead_id, "platform": body.platform, "data": result}


@router.post("/bulk-assign-platform")
def bulk_assign_platform(body: BulkEmailPlatformRequest):
    """Bulk-assign email_platform to a list of lead IDs."""
    if body.platform and body.platform not in EMAIL_PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform. Choose from: {list(EMAIL_PLATFORMS.keys())}",
        )
    count = bulk_set_email_platform(body.lead_ids, body.platform)
    return {"status": "ok", "updated": count, "platform": body.platform}


@router.post("/import")
async def import_leads(
    file: UploadFile = File(...),
    campaign_id: str | None = Query(default=None, description="Instantly campaign to auto-push new leads to"),
):
    """
    Upload a CSV or Excel file to ingest leads.
    - Deduplicates by email, LinkedIn, phone, name+company
    - Inserts new records into Supabase
    - Optionally auto-pushes to an Instantly.ai campaign
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = ingest_file(
            file_bytes=contents,
            filename=file.filename or "upload.csv",
            source="csv_upload",
            auto_push_campaign_id=campaign_id,
        )
        return result
    except Exception as e:
        logger.exception("Lead import failed")
        raise HTTPException(status_code=500, detail=str(e))


# Keep catch-all route LAST so specific routes above match first
@router.get("/{lead_id}")
def get_lead(lead_id: str):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
