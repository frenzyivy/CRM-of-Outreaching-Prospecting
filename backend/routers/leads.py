"""Leads API endpoints."""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from core.supabase_client import get_leads, get_lead_by_id
from tools.lead_ingestion import ingest_file

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("/companies")
def list_companies():
    return get_leads(lead_type="company")


@router.get("/contacts")
def list_contacts():
    return get_leads(lead_type="contact")


@router.get("/leads")
def list_leads():
    return get_leads(lead_type="lead")


@router.get("/{lead_type}/{lead_id}")
def get_lead(lead_type: str, lead_id: str):
    if lead_type not in ("company", "contact", "lead"):
        raise HTTPException(status_code=400, detail="lead_type must be 'company', 'contact', or 'lead'")
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/import")
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
