"""
Lemlist Integration
API: https://developer.lemlist.com/
Requires: LEMLIST_API_KEY in .env

Until an API key is configured, all functions return stub/demo data.
"""

import os
import pathlib
from datetime import datetime, timedelta

BASE_URL = "https://api.lemlist.com/api"


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
    return _read_env_key("LEMLIST_API_KEY")


def _is_connected() -> bool:
    return bool(_api_key())


def _auth() -> tuple[str, str]:
    """Lemlist uses HTTP Basic Auth: username='' password=api_key."""
    return ("", _api_key() or "")


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def get_account_quota() -> dict:
    """Return plan limits and current usage."""
    if not _is_connected():
        return _stub_quota()

    import httpx
    try:
        r = httpx.get(f"{BASE_URL}/team", auth=_auth(), timeout=10)
        r.raise_for_status()
        team = r.json()

        # Fetch send stats for the current period
        stats_r = httpx.get(f"{BASE_URL}/campaigns", auth=_auth(), timeout=10)
        stats_r.raise_for_status()
        campaigns = stats_r.json() or []

        total_sent = sum(c.get("statsSent", 0) or 0 for c in campaigns)

        return {
            "tool": "lemlist",
            "plan_name": team.get("plan", {}).get("name", "Unknown"),
            "emails_sent": total_sent,
            "emails_remaining": None,   # Lemlist limits vary by plan
            "contacts_used": team.get("leadsCount", 0),
            "contacts_max": team.get("plan", {}).get("maxLeads"),
            "reset_date": None,
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
        r = httpx.get(f"{BASE_URL}/campaigns", auth=_auth(), timeout=10)
        r.raise_for_status()
        campaigns = r.json() or []
        result = []
        for c in campaigns:
            sent = c.get("statsSent", 0) or 0
            opens = c.get("statsOpened", 0) or 0
            replies = c.get("statsReplied", 0) or 0
            clicks = c.get("statsClicked", 0) or 0
            bounces = c.get("statsBounced", 0) or 0
            result.append({
                "id": c.get("_id", ""),
                "name": c.get("name", "Untitled"),
                "status": c.get("status", "unknown").capitalize(),
                "sent": sent,
                "open_rate": round(opens / max(sent, 1) * 100, 1),
                "reply_rate": round(replies / max(sent, 1) * 100, 1),
                "click_rate": round(clicks / max(sent, 1) * 100, 1),
                "bounce_rate": round(bounces / max(sent, 1) * 100, 1),
                "unsubscribes": c.get("statsUnsubscribed", 0) or 0,
            })
        return result
    except Exception:
        return _stub_campaigns()


def get_daily_stats(days: int = 30) -> list[dict]:
    """Return daily send stats. Lemlist doesn't have a daily breakdown endpoint,
    so we return stubs/empty based on connection status."""
    if not _is_connected():
        return _stub_daily(days)
    return []


# ---------------------------------------------------------------------------
# Stub data
# ---------------------------------------------------------------------------

def _stub_quota() -> dict:
    return {
        "tool": "lemlist",
        "plan_name": "Pro",
        "emails_sent": 1800,
        "emails_remaining": 2200,
        "contacts_used": 950,
        "contacts_max": 2000,
        "reset_date": (datetime.now().replace(day=1) + timedelta(days=32)).replace(day=1).strftime("%Y-%m-%d"),
        "connected": False,
        "error": None,
    }


def _stub_campaigns() -> list[dict]:
    return [
        {
            "id": "ll-001",
            "name": "Hospital CFOs — Cold Outreach",
            "status": "Active",
            "sent": 780,
            "open_rate": 43.1,
            "reply_rate": 9.2,
            "click_rate": 4.1,
            "bounce_rate": 1.4,
            "unsubscribes": 6,
        },
        {
            "id": "ll-002",
            "name": "Clinic Managers — Follow-up",
            "status": "Paused",
            "sent": 420,
            "open_rate": 36.7,
            "reply_rate": 5.5,
            "click_rate": 2.8,
            "bounce_rate": 2.1,
            "unsubscribes": 4,
        },
        {
            "id": "ll-003",
            "name": "Pharma BD — Intro",
            "status": "Completed",
            "sent": 600,
            "open_rate": 39.5,
            "reply_rate": 7.3,
            "click_rate": 3.5,
            "bounce_rate": 1.2,
            "unsubscribes": 9,
        },
    ]


def _stub_daily(days: int) -> list[dict]:
    import random
    result = []
    today = datetime.now().date()
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        sent = random.randint(0, 80) if i % 7 not in (0, 6) else 0
        result.append({
            "date": d,
            "sent": sent,
            "opened": int(sent * 0.41),
            "replies": int(sent * 0.09),
            "clicks": int(sent * 0.04),
            "bounced": int(sent * 0.014),
        })
    return result
