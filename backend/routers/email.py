"""Instantly.ai Email API endpoints."""

from fastapi import APIRouter, Query

from integrations.instantly import get_all_instantly_data

router = APIRouter(prefix="/api/email", tags=["email"])


@router.get("/overview")
def email_overview():
    data = get_all_instantly_data()
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "error": data.get("error"),
    }


@router.get("/daily")
def email_daily(campaign_id: str | None = None, days: int = Query(default=30, ge=1, le=90)):
    data = get_all_instantly_data()
    return {
        "daily": data.get("daily", []),
        "error": data.get("error"),
    }


@router.get("/countries")
def email_countries():
    data = get_all_instantly_data()
    return {
        "country_stats": data.get("country_stats", []),
        "error": data.get("error"),
    }


@router.get("/leads")
def email_leads():
    data = get_all_instantly_data()
    return {
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "error": data.get("error"),
    }


@router.get("/refresh")
def email_refresh():
    data = get_all_instantly_data(force=True)
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "daily": data.get("daily", []),
        "country_stats": data.get("country_stats", []),
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "error": data.get("error"),
    }
