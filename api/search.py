"""Search & Health API endpoints."""

from fastapi import APIRouter, Query

from core.supabase_client import search_leads, get_lead_count

router = APIRouter(tags=["search"])


@router.get("/api/search")
def search_leads_endpoint(q: str = Query(default="", min_length=1), limit: int = Query(default=10, ge=1, le=50)):
    return search_leads(q, limit)


@router.get("/api/health")
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
