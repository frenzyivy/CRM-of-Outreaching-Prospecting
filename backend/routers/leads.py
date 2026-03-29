"""Leads API endpoints."""

import logging

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from core.supabase_client import get_leads, get_lead_by_id, get_company_data, get_people_data, get_company_employees
from tools.lead_ingestion import ingest_file

logger = logging.getLogger("leads")

router = APIRouter(prefix="/api/leads", tags=["leads"])


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
