"""Companies API endpoints (normalized schema)."""

import logging

from fastapi import APIRouter, HTTPException

from core.supabase_client import get_companies, get_company_detail

logger = logging.getLogger("companies")

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("")
def list_companies():
    """All companies from company_list_view — one row per company with location/lead counts."""
    return get_companies()


@router.get("/{company_id}")
def get_company(company_id: str):
    """Single company with nested locations (each with leads) and flat leads list."""
    company = get_company_detail(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
