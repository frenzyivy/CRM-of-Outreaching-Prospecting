"""
Instantly.ai API integration.
Fetches campaign analytics, daily stats, lead data, and country breakdowns.

API docs: https://developer.instantly.ai/
API version: v2 (Bearer token auth)
"""

import os
import time
from collections import Counter
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv(override=True)

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
    "sequence_steps": [],
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

# Warm-up campaign name patterns — filter these out from analytics
_WARMUP_PATTERNS = ("warmup", "warm-up", "warm up", "lemwarm", "mailwarm", "warmbox")


def _get_key() -> str | None:
    load_dotenv(override=True)
    return os.getenv("INSTANTLY_API_KEY")


def _headers() -> dict:
    key = _get_key()
    if not key:
        raise ValueError("INSTANTLY_API_KEY not set in .env")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _api_get(endpoint: str, params: dict | None = None, retries: int = 2) -> dict | list:
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(
                f"{BASE_URL}{endpoint}",
                headers=_headers(),
                params=params or {},
                timeout=45,
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(2 * (attempt + 1))  # 2s, 4s backoff
                continue
            raise
    raise last_err  # type: ignore[misc]


def _api_post(endpoint: str, body: dict | None = None, retries: int = 2) -> dict | list:
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = requests.post(
                f"{BASE_URL}{endpoint}",
                headers=_headers(),
                json=body or {},
                timeout=45,
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise last_err  # type: ignore[misc]


def _default_date_range(days: int = 30) -> tuple[str, str]:
    """Return (start_date, end_date) as ISO date strings for the last N days."""
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _is_warmup_campaign(name: str) -> bool:
    """Return True if a campaign name looks like a warm-up campaign."""
    lower = name.lower()
    return any(pat in lower for pat in _WARMUP_PATTERNS)


def invalidate_cache():
    """Force cache expiry so next fetch gets fresh data."""
    _cache["last_fetched"] = 0


# ---- Individual fetchers ----

def fetch_campaigns() -> list[dict]:
    """List all campaigns with status labels. Excludes warm-up campaigns."""
    try:
        data = _api_get("/campaigns", {"limit": 100})
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        return [
            {
                "id": c.get("id", ""),
                "name": c.get("name", "Unnamed"),
                "status": c.get("status", 0),
                "status_label": CAMPAIGN_STATUS_LABELS.get(c.get("status", 0), "Unknown"),
                "is_warmup": _is_warmup_campaign(c.get("name", "")),
            }
            for c in items
        ]
    except Exception as e:
        return [{"error": str(e)}]


def fetch_analytics_overview(start_date: str | None = None, end_date: str | None = None) -> dict:
    """
    Aggregated totals across all non-warmup campaigns.
    Uses explicit date range to match what Instantly native dashboard shows.
    Rates are calculated as: metric / emails_sent * 100.
    """
    try:
        if not start_date or not end_date:
            start_date, end_date = _default_date_range(30)

        params: dict = {
            "start_date": start_date,
            "end_date": end_date,
        }
        data = _api_get("/campaigns/analytics/overview", params)

        emails_sent = data.get("emails_sent_count", 0)
        unique_opens = data.get("open_count_unique", 0)
        unique_replies = data.get("reply_count_unique", 0)
        unique_clicks = data.get("link_click_count_unique", 0)
        bounced = data.get("bounced_count", 0)
        unsubscribed = data.get("unsubscribed_count", 0)

        # All rates use emails_sent as denominator — never contacted
        def _rate(n: int) -> float:
            return round((n / emails_sent * 100), 1) if emails_sent else 0.0

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
            "unsubscribed": unsubscribed,
            "link_clicks": data.get("link_click_count", 0),
            "unique_clicks": unique_clicks,
            "completed": data.get("completed_count", 0),
            "total_opportunities": data.get("total_opportunities", 0),
            "total_opportunity_value": data.get("total_opportunity_value", 0),
            "total_interested": data.get("total_interested", 0),
            "total_meeting_booked": data.get("total_meeting_booked", 0),
            "total_meeting_completed": data.get("total_meeting_completed", 0),
            "total_closed": data.get("total_closed", 0),
            # Rates: all relative to emails_sent
            "open_rate": _rate(unique_opens),
            "reply_rate": _rate(unique_replies),
            "click_rate": _rate(unique_clicks),
            "bounce_rate": _rate(bounced),
            "unsub_rate": _rate(unsubscribed),
            # Date range used (for debugging)
            "date_from": start_date,
            "date_to": end_date,
        }
    except Exception as e:
        return {"error": str(e)}


def fetch_campaign_analytics(start_date: str | None = None, end_date: str | None = None) -> list[dict]:
    """Per-campaign analytics with computed rates. Excludes warm-up campaigns."""
    try:
        if not start_date or not end_date:
            start_date, end_date = _default_date_range(30)

        params: dict = {
            "exclude_total_leads_count": "true",
            "start_date": start_date,
            "end_date": end_date,
        }
        data = _api_get("/campaigns/analytics", params)
        items = data if isinstance(data, list) else data.get("data", [])
        results = []
        for c in items:
            name = c.get("campaign_name", "Unnamed")
            if _is_warmup_campaign(name):
                continue

            sent = c.get("emails_sent_count", 0)
            opens = c.get("open_count_unique", 0)
            replies = c.get("reply_count_unique", 0)
            clicks = c.get("link_click_count_unique", 0)
            bounced = c.get("bounced_count", 0)
            unsubscribed = c.get("unsubscribed_count", 0)
            status_code = c.get("campaign_status", 0)

            def _rate(n: int) -> float:
                return round((n / sent * 100), 1) if sent else 0.0

            results.append({
                "campaign_id": c.get("campaign_id", ""),
                "campaign_name": name,
                "status": status_code,
                "status_label": CAMPAIGN_STATUS_LABELS.get(status_code, "Unknown"),
                "emails_sent": sent,
                "contacted": c.get("contacted_count", 0),
                "opens": opens,
                "replies": replies,
                "bounced": bounced,
                "unsubscribed": unsubscribed,
                "clicks": clicks,
                "completed": c.get("completed_count", 0),
                "opportunities": c.get("total_opportunities", 0),
                "interested": c.get("total_interested", 0),
                "meetings_booked": c.get("total_meeting_booked", 0),
                "open_rate": _rate(opens),
                "reply_rate": _rate(replies),
                "click_rate": _rate(clicks),
                "bounce_rate": _rate(bounced),
                "unsub_rate": _rate(unsubscribed),
            })
        return results
    except Exception as e:
        return [{"error": str(e)}]


def fetch_daily_analytics(
    campaign_id: str | None = None,
    days: int = 30,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """Daily time-series analytics."""
    if not start_date or not end_date:
        start_date, end_date = _default_date_range(days)

    params: dict = {
        "start_date": start_date,
        "end_date": end_date,
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
                "unsubscribed": d.get("unsubscribed", 0),
            }
            for d in items
        ]
    except Exception as e:
        return [{"error": str(e)}]


def fetch_sequence_steps(campaign_id: str) -> list[dict]:
    """
    Fetch per-step analytics for a single campaign.
    Returns step-by-step funnel: sent → opened → replied.
    """
    try:
        data = _api_get(f"/campaigns/{campaign_id}/analytics/steps")
        items = data if isinstance(data, list) else data.get("data", data.get("steps", []))
        results = []
        for step in items:
            sent = step.get("emails_sent_count", step.get("sent", 0))
            opens = step.get("open_count_unique", step.get("opened", 0))
            replies = step.get("reply_count_unique", step.get("replies", 0))
            clicks = step.get("link_click_count_unique", step.get("clicks", 0))

            def _rate(n: int) -> float:
                return round((n / sent * 100), 1) if sent else 0.0

            results.append({
                "step_number": step.get("step", step.get("sequence_step", len(results) + 1)),
                "emails_sent": sent,
                "unique_opens": opens,
                "unique_replies": replies,
                "unique_clicks": clicks,
                "open_rate": _rate(opens),
                "reply_rate": _rate(replies),
            })
        return results
    except Exception:
        # Step analytics may not be available for all accounts/plans — return empty silently
        return []


def fetch_all_sequence_steps(campaigns: list[dict]) -> list[dict]:
    """
    Aggregate sequence step data across all non-warmup campaigns.
    Combines step metrics across campaigns for the funnel chart.
    """
    if not campaigns:
        return []

    # Collect all non-warmup campaign IDs
    campaign_ids = [
        c["id"] for c in campaigns
        if not c.get("is_warmup", False) and c.get("id")
        and "error" not in c
    ]

    if not campaign_ids:
        return []

    # Aggregate by step number across campaigns
    step_totals: dict[int, dict] = {}
    for cid in campaign_ids[:5]:  # Limit to avoid rate limiting
        steps = fetch_sequence_steps(cid)
        for s in steps:
            n = s["step_number"]
            if n not in step_totals:
                step_totals[n] = {
                    "step_number": n,
                    "emails_sent": 0,
                    "unique_opens": 0,
                    "unique_replies": 0,
                    "unique_clicks": 0,
                }
            step_totals[n]["emails_sent"] += s["emails_sent"]
            step_totals[n]["unique_opens"] += s["unique_opens"]
            step_totals[n]["unique_replies"] += s["unique_replies"]
            step_totals[n]["unique_clicks"] += s["unique_clicks"]

    # Recompute rates from aggregated totals
    result = []
    for n in sorted(step_totals.keys()):
        s = step_totals[n]
        sent = s["emails_sent"]
        result.append({
            **s,
            "open_rate": round((s["unique_opens"] / sent * 100), 1) if sent else 0.0,
            "reply_rate": round((s["unique_replies"] / sent * 100), 1) if sent else 0.0,
        })
    return result


def _fetch_leads_page(body: dict) -> dict:
    """Fetch a single page of leads."""
    return _api_post("/leads/list", body)


def fetch_all_leads(campaign_id: str | None = None, max_pages: int = 10) -> list[dict]:
    """
    Fetch leads with pagination. Extracts country/location/specialty from payload.
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
                city = payload.get("city") or payload.get("City") or ""

                # Extract specialty from payload custom fields
                specialty = (
                    payload.get("specialty")
                    or payload.get("Specialty")
                    or payload.get("jobCategory")
                    or _infer_specialty(
                        payload.get("jobTitle", lead.get("company_name", ""))
                    )
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
                    "specialty": specialty or "Other",
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


def _infer_specialty(text: str) -> str | None:
    """Guess specialty from job title or company name keywords."""
    if not text:
        return None
    lower = text.lower()
    if any(k in lower for k in ("dent", "dental", "stomatolog", "zahnarzt", "dentist")):
        return "Dentist"
    if any(k in lower for k in ("dermat", "skin", "esthetician")):
        return "Dermatologist"
    if any(k in lower for k in ("pharma", "drug", "medicine", "medical", "health")):
        return "Pharma/Healthcare"
    return None


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
        ".pl": "Poland", ".si": "Slovenia", ".hr": "Croatia", ".at": "Austria",
        ".ch": "Switzerland", ".be": "Belgium", ".pt": "Portugal", ".cz": "Czech Republic",
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
        if status in (1, 3):  # Active or Completed
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

    result = sorted(country_data.values(), key=lambda x: x["total_leads"], reverse=True)
    for c in result:
        total = c["total_leads"] or 1
        c["open_rate"] = round((c["opened"] / total) * 100, 1)
        c["reply_rate"] = round((c["replied"] / total) * 100, 1)

    return result


def build_specialty_stats(leads: list[dict]) -> list[dict]:
    """Aggregate leads by specialty (Dentist, Dermatologist, etc.)."""
    valid_leads = [l for l in leads if "error" not in l]
    if not valid_leads:
        return []

    spec_data: dict = {}
    for lead in valid_leads:
        spec = lead.get("specialty") or "Other"
        if spec not in spec_data:
            spec_data[spec] = {
                "specialty": spec,
                "total_leads": 0,
                "opened": 0,
                "replied": 0,
                "interested": 0,
            }
        s = spec_data[spec]
        s["total_leads"] += 1
        if lead.get("email_open_count", 0) > 0:
            s["opened"] += 1
        if lead.get("email_reply_count", 0) > 0:
            s["replied"] += 1
        if lead.get("interest") == 1:
            s["interested"] += 1

    result = sorted(spec_data.values(), key=lambda x: x["total_leads"], reverse=True)
    for s in result:
        total = s["total_leads"] or 1
        s["open_rate"] = round((s["opened"] / total) * 100, 1)
        s["reply_rate"] = round((s["replied"] / total) * 100, 1)

    return result


def build_lead_status_breakdown(leads: list[dict]) -> dict:
    """Count leads by interest status."""
    valid_leads = [l for l in leads if "error" not in l]
    interest_counts: Counter = Counter()
    status_counts: Counter = Counter()

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

def get_all_instantly_data(
    force: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """
    Fetch all Instantly data. Cached for CACHE_TTL seconds.
    Pass start_date/end_date (ISO strings) to scope analytics to a specific range.
    Returns overview, campaigns, analytics, daily, leads, country stats, specialty stats.
    """
    global _cache

    # Use last 30 days if no range given
    if not start_date or not end_date:
        start_date, end_date = _default_date_range(30)

    now = time.time()
    # Cache key includes date range so different ranges don't collide
    cache_key = f"{start_date}:{end_date}"
    cached_range = _cache.get("_range_key", "")

    if not force and (now - _cache["last_fetched"]) < CACHE_TTL and cached_range == cache_key:
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
            "specialty_stats": [],
            "lead_status_breakdown": {},
            "sequence_steps": [],
            "last_fetched": 0,
            "_range_key": cache_key,
            "error": "INSTANTLY_API_KEY not set. Add your API key to .env file.",
        }

    error = None
    try:
        overview = fetch_analytics_overview(start_date, end_date)
        campaigns = fetch_campaigns()
        campaign_analytics = fetch_campaign_analytics(start_date, end_date)
        daily = fetch_daily_analytics(start_date=start_date, end_date=end_date)
        leads = fetch_all_leads()

        # Aggregate sequence steps across non-warmup campaigns
        non_warmup = [c for c in campaigns if not c.get("is_warmup") and "error" not in c]
        sequence_steps = fetch_all_sequence_steps(non_warmup)

        # Build derived analytics
        country_stats = build_country_stats(leads)
        specialty_stats = build_specialty_stats(leads)
        lead_status_breakdown = build_lead_status_breakdown(leads)

        # Surface errors without losing data
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
            "specialty_stats": specialty_stats,
            "lead_status_breakdown": lead_status_breakdown,
            "sequence_steps": sequence_steps,
            "last_fetched": now,
            "_range_key": cache_key,
            "error": error,
        }
    except Exception as e:
        _cache = {
            **{k: _cache.get(k, [] if k != "overview" else {}) for k in
               ["overview", "campaigns", "campaign_analytics", "daily", "leads",
                "country_stats", "specialty_stats", "lead_status_breakdown", "sequence_steps"]},
            "last_fetched": now,
            "_range_key": cache_key,
            "error": str(e),
        }

    return _cache
