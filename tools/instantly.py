"""
Instantly.ai API integration.
Fetches campaign analytics, daily stats, lead data, and country breakdowns.

API docs: https://developer.instantly.ai/
API version: v2 (Bearer token auth)
"""

import os
import time
from collections import Counter

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api.instantly.ai/api/v2"
CACHE_TTL = 60  # 1 minute auto-sync

_cache = {
    "overview": {},
    "campaigns": [],
    "campaign_analytics": [],
    "daily": [],
    "leads": [],
    "country_stats": [],
    "lead_status_breakdown": {},
    "last_fetched": 0,
    "error": None,
}

# Lead interest status mapping
INTEREST_LABELS = {
    0: "Out of Office",
    1: "Interested",
    2: "Meeting Booked",
    3: "Meeting Completed",
    4: "Won",
    -1: "Not Interested",
    -2: "Wrong Person",
    -3: "Lost",
    -4: "No Show",
}

# Lead status mapping
STATUS_LABELS = {
    1: "Active",
    2: "Paused",
    3: "Completed",
    -1: "Bounced",
    -2: "Unsubscribed",
    -3: "Skipped",
}

# Campaign status mapping
CAMPAIGN_STATUS_LABELS = {
    0: "Draft",
    1: "Active",
    2: "Paused",
    3: "Completed",
    4: "Running Subsequences",
    -99: "Suspended",
    -1: "Accounts Unhealthy",
    -2: "Bounce Protect",
}


def _get_key() -> str | None:
    return os.getenv("INSTANTLY_API_KEY")


def _headers() -> dict:
    key = _get_key()
    if not key:
        raise ValueError("INSTANTLY_API_KEY not set in .env")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _api_get(endpoint: str, params: dict | None = None) -> dict | list:
    resp = requests.get(
        f"{BASE_URL}{endpoint}",
        headers=_headers(),
        params=params or {},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def _api_post(endpoint: str, body: dict | None = None) -> dict | list:
    resp = requests.post(
        f"{BASE_URL}{endpoint}",
        headers=_headers(),
        json=body or {},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def invalidate_cache():
    """Force cache expiry so next fetch gets fresh data."""
    _cache["last_fetched"] = 0


# ---- Individual fetchers ----

def fetch_campaigns() -> list[dict]:
    """List all campaigns with status labels."""
    try:
        data = _api_get("/campaigns", {"limit": 100})
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        return [
            {
                "id": c.get("id", ""),
                "name": c.get("name", "Unnamed"),
                "status": c.get("status", 0),
                "status_label": CAMPAIGN_STATUS_LABELS.get(c.get("status", 0), "Unknown"),
            }
            for c in items
        ]
    except Exception as e:
        return [{"error": str(e)}]


def fetch_analytics_overview() -> dict:
    """Aggregated totals across all campaigns."""
    try:
        data = _api_get("/campaigns/analytics/overview")
        emails_sent = data.get("emails_sent_count", 0)
        unique_opens = data.get("open_count_unique", 0)
        unique_replies = data.get("reply_count_unique", 0)
        unique_clicks = data.get("link_click_count_unique", 0)
        bounced = data.get("bounced_count", 0)

        return {
            "emails_sent": emails_sent,
            "contacted": data.get("contacted_count", 0),
            "leads_count": data.get("leads_count", 0),
            "new_leads_contacted": data.get("new_leads_contacted_count", 0),
            "open_count": data.get("open_count", 0),
            "unique_opens": unique_opens,
            "reply_count": data.get("reply_count", 0),
            "unique_replies": unique_replies,
            "bounce_count": bounced,
            "unsubscribed": data.get("unsubscribed_count", 0),
            "link_clicks": data.get("link_click_count", 0),
            "unique_clicks": unique_clicks,
            "completed": data.get("completed_count", 0),
            "total_opportunities": data.get("total_opportunities", 0),
            "total_opportunity_value": data.get("total_opportunity_value", 0),
            "total_interested": data.get("total_interested", 0),
            "total_meeting_booked": data.get("total_meeting_booked", 0),
            "total_meeting_completed": data.get("total_meeting_completed", 0),
            "total_closed": data.get("total_closed", 0),
            # Pre-computed rates
            "open_rate": round((unique_opens / emails_sent * 100), 1) if emails_sent else 0,
            "reply_rate": round((unique_replies / emails_sent * 100), 1) if emails_sent else 0,
            "click_rate": round((unique_clicks / emails_sent * 100), 1) if emails_sent else 0,
            "bounce_rate": round((bounced / emails_sent * 100), 1) if emails_sent else 0,
        }
    except Exception as e:
        return {"error": str(e)}


def fetch_campaign_analytics() -> list[dict]:
    """Per-campaign analytics with computed rates."""
    try:
        data = _api_get("/campaigns/analytics", {"exclude_total_leads_count": "true"})
        items = data if isinstance(data, list) else data.get("data", [])
        results = []
        for c in items:
            sent = c.get("emails_sent_count", 0)
            opens = c.get("open_count_unique", 0)
            replies = c.get("reply_count_unique", 0)
            clicks = c.get("link_click_count_unique", 0)
            bounced = c.get("bounced_count", 0)
            status_code = c.get("campaign_status", 0)

            results.append({
                "campaign_id": c.get("campaign_id", ""),
                "campaign_name": c.get("campaign_name", "Unnamed"),
                "status": status_code,
                "status_label": CAMPAIGN_STATUS_LABELS.get(status_code, "Unknown"),
                "emails_sent": sent,
                "contacted": c.get("contacted_count", 0),
                "opens": opens,
                "replies": replies,
                "bounced": bounced,
                "unsubscribed": c.get("unsubscribed_count", 0),
                "clicks": clicks,
                "completed": c.get("completed_count", 0),
                "opportunities": c.get("total_opportunities", 0),
                "open_rate": round((opens / sent * 100), 1) if sent else 0,
                "reply_rate": round((replies / sent * 100), 1) if sent else 0,
                "click_rate": round((clicks / sent * 100), 1) if sent else 0,
                "bounce_rate": round((bounced / sent * 100), 1) if sent else 0,
            })
        return results
    except Exception as e:
        return [{"error": str(e)}]


def fetch_daily_analytics(campaign_id: str | None = None, days: int = 30) -> list[dict]:
    """Daily time-series analytics."""
    from datetime import datetime, timedelta, timezone

    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    params: dict = {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
    }
    if campaign_id:
        params["campaign_id"] = campaign_id

    try:
        data = _api_get("/campaigns/analytics/daily", params)
        items = data if isinstance(data, list) else data.get("data", [])
        return [
            {
                "date": d.get("date", ""),
                "sent": d.get("sent", 0),
                "opened": d.get("unique_opened", d.get("opened", 0)),
                "replies": d.get("unique_replies", d.get("replies", 0)),
                "clicks": d.get("unique_clicks", d.get("clicks", 0)),
                "bounced": d.get("bounced", 0),
            }
            for d in items
        ]
    except Exception as e:
        return [{"error": str(e)}]


def _fetch_leads_page(body: dict) -> dict:
    """Fetch a single page of leads."""
    return _api_post("/leads/list", body)


def fetch_all_leads(campaign_id: str | None = None, max_pages: int = 10) -> list[dict]:
    """
    Fetch leads with pagination. Extracts country/location from payload.
    Returns simplified lead objects for analytics.
    """
    try:
        all_leads = []
        cursor = None

        for _ in range(max_pages):
            body: dict = {"limit": 100}
            if campaign_id:
                body["campaign"] = campaign_id
            if cursor:
                body["starting_after"] = cursor

            data = _api_post("/leads/list", body)
            items = data.get("items", [])
            if not items:
                break

            for lead in items:
                payload = lead.get("payload") or {}
                # Try common field names for country/location
                country = (
                    payload.get("country")
                    or payload.get("Country")
                    or payload.get("location")
                    or payload.get("Location")
                    or payload.get("country_name")
                    or payload.get("geo")
                    or _extract_country_from_domain(lead.get("company_domain", ""))
                    or "Unknown"
                )
                city = (
                    payload.get("city")
                    or payload.get("City")
                    or ""
                )

                all_leads.append({
                    "id": lead.get("id", ""),
                    "email": lead.get("email", ""),
                    "first_name": lead.get("first_name", ""),
                    "last_name": lead.get("last_name", ""),
                    "company_name": lead.get("company_name", ""),
                    "company_domain": lead.get("company_domain", ""),
                    "phone": lead.get("phone", ""),
                    "country": country.strip() if country else "Unknown",
                    "city": city.strip() if city else "",
                    "status": lead.get("status", 0),
                    "status_label": STATUS_LABELS.get(lead.get("status", 0), "Unknown"),
                    "interest": lead.get("lt_interest_status"),
                    "interest_label": INTEREST_LABELS.get(lead.get("lt_interest_status"), "Lead"),
                    "email_open_count": lead.get("email_open_count", 0),
                    "email_reply_count": lead.get("email_reply_count", 0),
                    "email_click_count": lead.get("email_click_count", 0),
                    "campaign_id": lead.get("campaign") or "",
                })

            cursor = data.get("next_starting_after")
            if not cursor:
                break

        return all_leads
    except Exception as e:
        return [{"error": str(e)}]


def _extract_country_from_domain(domain: str) -> str | None:
    """Try to guess country from TLD as a fallback."""
    if not domain:
        return None
    tld_map = {
        ".ae": "UAE", ".sa": "Saudi Arabia", ".in": "India", ".uk": "UK",
        ".us": "USA", ".ca": "Canada", ".au": "Australia", ".de": "Germany",
        ".fr": "France", ".sg": "Singapore", ".my": "Malaysia", ".pk": "Pakistan",
        ".eg": "Egypt", ".qa": "Qatar", ".kw": "Kuwait", ".bh": "Bahrain",
        ".om": "Oman", ".jo": "Jordan", ".lb": "Lebanon", ".ng": "Nigeria",
        ".za": "South Africa", ".ke": "Kenya", ".ph": "Philippines",
        ".br": "Brazil", ".mx": "Mexico", ".jp": "Japan", ".kr": "South Korea",
        ".cn": "China", ".it": "Italy", ".es": "Spain", ".nl": "Netherlands",
        ".se": "Sweden", ".no": "Norway", ".dk": "Denmark", ".fi": "Finland",
    }
    for tld, country in tld_map.items():
        if domain.endswith(tld):
            return country
    return None


def build_country_stats(leads: list[dict]) -> list[dict]:
    """Aggregate leads by country with open/reply/bounce breakdowns."""
    valid_leads = [l for l in leads if "error" not in l]
    if not valid_leads:
        return []

    country_data: dict = {}
    for lead in valid_leads:
        country = lead.get("country", "Unknown")
        if country not in country_data:
            country_data[country] = {
                "country": country,
                "total_leads": 0,
                "contacted": 0,
                "opened": 0,
                "replied": 0,
                "clicked": 0,
                "bounced": 0,
                "interested": 0,
                "meeting_booked": 0,
            }
        c = country_data[country]
        c["total_leads"] += 1

        status = lead.get("status", 0)
        if status == 1 or status == 3:  # Active or Completed
            c["contacted"] += 1
        if status == -1:
            c["bounced"] += 1
        if lead.get("email_open_count", 0) > 0:
            c["opened"] += 1
        if lead.get("email_reply_count", 0) > 0:
            c["replied"] += 1
        if lead.get("email_click_count", 0) > 0:
            c["clicked"] += 1

        interest = lead.get("interest")
        if interest == 1:
            c["interested"] += 1
        elif interest == 2:
            c["meeting_booked"] += 1

    # Sort by total leads descending
    result = sorted(country_data.values(), key=lambda x: x["total_leads"], reverse=True)

    # Add rates
    for c in result:
        total = c["total_leads"] or 1
        c["open_rate"] = round((c["opened"] / total) * 100, 1)
        c["reply_rate"] = round((c["replied"] / total) * 100, 1)

    return result


def build_lead_status_breakdown(leads: list[dict]) -> dict:
    """Count leads by interest status."""
    valid_leads = [l for l in leads if "error" not in l]
    interest_counts = Counter()
    status_counts = Counter()

    for lead in valid_leads:
        interest = lead.get("interest")
        label = INTEREST_LABELS.get(interest, "Lead")
        interest_counts[label] += 1

        status = lead.get("status", 0)
        s_label = STATUS_LABELS.get(status, "Unknown")
        status_counts[s_label] += 1

    return {
        "by_interest": dict(interest_counts.most_common()),
        "by_status": dict(status_counts.most_common()),
        "total": len(valid_leads),
    }


# ---- Main entry point (cached) ----

def get_all_instantly_data(force: bool = False) -> dict:
    """
    Fetch all Instantly data. Cached for CACHE_TTL seconds.
    Returns overview, campaigns, analytics, daily, leads, country stats.
    """
    global _cache

    now = time.time()
    if not force and (now - _cache["last_fetched"]) < CACHE_TTL:
        return _cache

    key = _get_key()
    if not key:
        return {
            "overview": {},
            "campaigns": [],
            "campaign_analytics": [],
            "daily": [],
            "leads": [],
            "country_stats": [],
            "lead_status_breakdown": {},
            "last_fetched": now,
            "error": "INSTANTLY_API_KEY not set. Add your API key to .env file.",
        }

    error = None
    try:
        overview = fetch_analytics_overview()
        campaigns = fetch_campaigns()
        campaign_analytics = fetch_campaign_analytics()
        daily = fetch_daily_analytics()
        leads = fetch_all_leads()

        # Build derived analytics
        country_stats = build_country_stats(leads)
        lead_status_breakdown = build_lead_status_breakdown(leads)

        # Check for nested errors
        if "error" in overview:
            error = f"Overview: {overview.pop('error')}"

        campaign_errors = [c.get("error") for c in campaigns if "error" in c]
        if campaign_errors:
            error = error or f"Campaigns: {campaign_errors[0]}"
            campaigns = [c for c in campaigns if "error" not in c]

        analytics_errors = [c.get("error") for c in campaign_analytics if "error" in c]
        if analytics_errors:
            error = error or f"Analytics: {analytics_errors[0]}"
            campaign_analytics = [c for c in campaign_analytics if "error" not in c]

        daily_errors = [d.get("error") for d in daily if "error" in d]
        if daily_errors:
            error = error or f"Daily: {daily_errors[0]}"
            daily = [d for d in daily if "error" not in d]

        lead_errors = [l.get("error") for l in leads if "error" in l]
        if lead_errors:
            error = error or f"Leads: {lead_errors[0]}"
            leads = [l for l in leads if "error" not in l]

        _cache = {
            "overview": overview,
            "campaigns": campaigns,
            "campaign_analytics": campaign_analytics,
            "daily": daily,
            "leads": leads,
            "country_stats": country_stats,
            "lead_status_breakdown": lead_status_breakdown,
            "last_fetched": now,
            "error": error,
        }
    except Exception as e:
        _cache = {
            **{k: _cache.get(k, [] if k != "overview" else {}) for k in
               ["overview", "campaigns", "campaign_analytics", "daily", "leads",
                "country_stats", "lead_status_breakdown"]},
            "last_fetched": now,
            "error": str(e),
        }

    return _cache
