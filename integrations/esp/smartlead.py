"""
Smartlead Integration
API: https://docs.smartlead.ai/
Requires: SMARTLEAD_API_KEY in .env

Until an API key is configured, all functions return stub/demo data.
"""

import os
import pathlib
from datetime import datetime, timedelta

BASE_URL = "https://server.smartlead.ai/api/v1"


def _read_env_key(var: str) -> str | None:
    """Read a key directly from .env on every call so new keys take effect without restart."""
    env_path = pathlib.Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith(f"{var}=") and not line.startswith("#"):
                val = line[len(var) + 1:].strip()
                return val if val else None
    return os.getenv(var, "").strip() or None


def _api_key() -> str | None:
    return _read_env_key("SMARTLEAD_API_KEY")


def _is_connected() -> bool:
    return bool(_api_key())


def _params() -> dict:
    """Smartlead passes the API key as a query param."""
    return {"api_key": _api_key()}


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def get_account_quota() -> dict:
    """Return plan limits and current usage."""
    if not _is_connected():
        return _stub_quota()

    import httpx
    try:
        r = httpx.get(
            f"{BASE_URL}/client/subscription-payment-methods/fetch-active-plan",
            params=_params(),
            timeout=10,
        )
        r.raise_for_status()
        plan_data = r.json() or {}

        # Fetch total sent from campaigns
        campaigns_r = httpx.get(f"{BASE_URL}/campaigns", params=_params(), timeout=10)
        campaigns_r.raise_for_status()
        campaigns = campaigns_r.json() or []
        total_sent = sum(c.get("sent_count", 0) or 0 for c in campaigns)

        limits = plan_data.get("email_per_month_limit", None)
        return {
            "tool": "smartlead",
            "plan_name": plan_data.get("plan_name", "Unknown"),
            "emails_sent": total_sent,
            "emails_remaining": (limits - total_sent) if limits else None,
            "contacts_used": sum(c.get("lead_count", 0) or 0 for c in campaigns),
            "contacts_max": plan_data.get("leads_limit"),
            "reset_date": plan_data.get("next_renewal_date"),
            "connected": True,
            "error": None,
        }
    except Exception as e:
        return {**_stub_quota(), "connected": False, "error": str(e)}


def get_campaigns() -> list[dict]:
    """Return list of campaigns with aggregate stats."""
    if not _is_connected():
        return _stub_campaigns()

    import httpx
    try:
        r = httpx.get(f"{BASE_URL}/campaigns", params=_params(), timeout=10)
        r.raise_for_status()
        campaigns = r.json() or []
        result = []
        for c in campaigns:
            sent = c.get("sent_count", 0) or 0
            opens = c.get("open_count", 0) or 0
            replies = c.get("reply_count", 0) or 0
            clicks = c.get("click_count", 0) or 0
            bounces = c.get("bounce_count", 0) or 0
            result.append({
                "id": str(c.get("id", "")),
                "name": c.get("name", "Untitled"),
                "status": c.get("status", "UNKNOWN").capitalize(),
                "sent": sent,
                "open_rate": round(opens / max(sent, 1) * 100, 1),
                "reply_rate": round(replies / max(sent, 1) * 100, 1),
                "click_rate": round(clicks / max(sent, 1) * 100, 1),
                "bounce_rate": round(bounces / max(sent, 1) * 100, 1),
                "unsubscribes": c.get("unsubscribed_count", 0) or 0,
            })
        return result
    except Exception:
        return _stub_campaigns()


def get_daily_stats(days: int = 30) -> list[dict]:
    """Return daily send stats per campaign aggregated across all campaigns."""
    if not _is_connected():
        return _stub_daily(days)

    import httpx
    try:
        r = httpx.get(f"{BASE_URL}/campaigns", params=_params(), timeout=10)
        r.raise_for_status()
        campaigns = r.json() or []

        day_map: dict[str, dict] = {}
        for c in campaigns:
            cid = c.get("id")
            if not cid:
                continue
            sr = httpx.get(
                f"{BASE_URL}/campaigns/{cid}/analytics-by-date",
                params=_params(),
                timeout=10,
            )
            if sr.status_code != 200:
                continue
            for entry in (sr.json() or []):
                d = (entry.get("date") or "")[:10]
                if not d:
                    continue
                if d not in day_map:
                    day_map[d] = {"date": d, "sent": 0, "opened": 0, "replies": 0, "clicks": 0, "bounced": 0}
                day_map[d]["sent"] += entry.get("sent_count", 0) or 0
                day_map[d]["opened"] += entry.get("open_count", 0) or 0
                day_map[d]["replies"] += entry.get("reply_count", 0) or 0
                day_map[d]["clicks"] += entry.get("click_count", 0) or 0
                day_map[d]["bounced"] += entry.get("bounce_count", 0) or 0

        return sorted(day_map.values(), key=lambda x: x["date"])[-days:]
    except Exception:
        return _stub_daily(days)


# ---------------------------------------------------------------------------
# Stub data
# ---------------------------------------------------------------------------

def _stub_quota() -> dict:
    return {
        "tool": "smartlead",
        "plan_name": "Basic",
        "emails_sent": 1200,
        "emails_remaining": 800,
        "contacts_used": 620,
        "contacts_max": 1000,
        "reset_date": (datetime.now().replace(day=1) + timedelta(days=32)).replace(day=1).strftime("%Y-%m-%d"),
        "connected": False,
        "error": None,
    }


def _stub_campaigns() -> list[dict]:
    return [
        {
            "id": "sl-001",
            "name": "GP Clinics — Cold Outreach",
            "status": "Active",
            "sent": 560,
            "open_rate": 31.2,
            "reply_rate": 4.8,
            "click_rate": 2.9,
            "bounce_rate": 2.5,
            "unsubscribes": 7,
        },
        {
            "id": "sl-002",
            "name": "Dental Practices — Sequence",
            "status": "Completed",
            "sent": 420,
            "open_rate": 28.5,
            "reply_rate": 3.6,
            "click_rate": 1.8,
            "bounce_rate": 1.9,
            "unsubscribes": 5,
        },
        {
            "id": "sl-003",
            "name": "Allied Health — Follow-up",
            "status": "Paused",
            "sent": 220,
            "open_rate": 24.1,
            "reply_rate": 2.7,
            "click_rate": 1.4,
            "bounce_rate": 3.1,
            "unsubscribes": 3,
        },
    ]


def _stub_daily(days: int) -> list[dict]:
    import random
    result = []
    today = datetime.now().date()
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        sent = random.randint(0, 60) if i % 7 not in (0, 6) else 0
        result.append({
            "date": d,
            "sent": sent,
            "opened": int(sent * 0.30),
            "replies": int(sent * 0.05),
            "clicks": int(sent * 0.03),
            "bounced": int(sent * 0.025),
        })
    return result
