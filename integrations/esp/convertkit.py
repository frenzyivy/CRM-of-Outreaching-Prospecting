"""
ConvertKit Integration
API v4: https://developers.convertkit.com/
Requires: CONVERTKIT_API_KEY in .env

Until an API key is configured, all functions return stub/demo data so the
UI renders correctly without a live connection.
"""

import os
import pathlib
from datetime import datetime, timedelta

BASE_URL = "https://api.convertkit.com/v4"


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
    return _read_env_key("CONVERTKIT_API_KEY")


def _is_connected() -> bool:
    return bool(_api_key())


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Public interface — all functions fall back to stub data when not connected
# ---------------------------------------------------------------------------

def get_account_quota() -> dict:
    """Return plan limits and current usage."""
    if not _is_connected():
        return _stub_quota()

    import httpx
    try:
        r = httpx.get(f"{BASE_URL}/account", headers=_headers(), timeout=10)
        r.raise_for_status()
        data = r.json()
        account = data.get("account", {})
        plan = account.get("plan_name", "Unknown")

        # Subscriber count from account info
        subs = account.get("primary_email_address_subscribers_count", 0)

        # ConvertKit v4 doesn't expose a hard email-send limit via API;
        # we surface subscriber usage as the primary quota signal.
        return {
            "tool": "convertkit",
            "plan_name": plan,
            "emails_sent": 0,          # ConvertKit doesn't expose this directly
            "emails_remaining": None,   # No hard limit on sends for most plans
            "contacts_used": subs,
            "contacts_max": None,       # Plan-dependent; not in v4 API
            "reset_date": None,
            "connected": True,
            "error": None,
        }
    except Exception as e:
        return {**_stub_quota(), "connected": False, "error": str(e)}


def get_campaigns() -> list[dict]:
    """Return list of broadcasts with aggregate stats."""
    if not _is_connected():
        return _stub_campaigns()

    import httpx
    try:
        r = httpx.get(f"{BASE_URL}/broadcasts", headers=_headers(), timeout=10)
        r.raise_for_status()
        broadcasts = r.json().get("broadcasts", [])
        result = []
        for b in broadcasts:
            stats = b.get("stats", {})
            sent = stats.get("recipients", 0) or 0
            opens = stats.get("open_rate", 0) or 0
            clicks = stats.get("click_rate", 0) or 0
            result.append({
                "id": str(b.get("id")),
                "name": b.get("subject") or b.get("description") or "Untitled",
                "status": b.get("published_at") and "Sent" or "Draft",
                "sent": sent,
                "open_rate": round(opens * 100, 1),
                "reply_rate": 0.0,   # ConvertKit doesn't track replies
                "click_rate": round(clicks * 100, 1),
                "bounce_rate": round((stats.get("unsubscribes", 0) or 0) / max(sent, 1) * 100, 1),
                "unsubscribes": stats.get("unsubscribes", 0) or 0,
            })
        return result
    except Exception:
        return _stub_campaigns()


def get_daily_stats(days: int = 30) -> list[dict]:
    """Return daily send stats. ConvertKit v4 doesn't have a daily breakdown
    endpoint, so we return an empty list when connected (frontend handles gracefully)."""
    if not _is_connected():
        return _stub_daily(days)
    return []


# ---------------------------------------------------------------------------
# Stub data (shown before API key is added)
# ---------------------------------------------------------------------------

def _stub_quota() -> dict:
    return {
        "tool": "convertkit",
        "plan_name": "Creator",
        "emails_sent": 6200,
        "emails_remaining": None,
        "contacts_used": 3400,
        "contacts_max": 5000,
        "reset_date": (datetime.now().replace(day=1) + timedelta(days=32)).replace(day=1).strftime("%Y-%m-%d"),
        "connected": False,
        "error": None,
    }


def _stub_campaigns() -> list[dict]:
    return [
        {
            "id": "ck-001",
            "name": "Newsletter #1 — Spring Intro",
            "status": "Sent",
            "sent": 3200,
            "open_rate": 38.4,
            "reply_rate": 0.0,
            "click_rate": 5.2,
            "bounce_rate": 0.8,
            "unsubscribes": 12,
        },
        {
            "id": "ck-002",
            "name": "Product Update — March",
            "status": "Sent",
            "sent": 2100,
            "open_rate": 41.0,
            "reply_rate": 0.0,
            "click_rate": 7.1,
            "bounce_rate": 0.5,
            "unsubscribes": 8,
        },
        {
            "id": "ck-003",
            "name": "Welcome Sequence — Step 1",
            "status": "Active",
            "sent": 890,
            "open_rate": 58.3,
            "reply_rate": 0.0,
            "click_rate": 12.4,
            "bounce_rate": 0.2,
            "unsubscribes": 3,
        },
    ]


def _stub_daily(days: int) -> list[dict]:
    import random
    result = []
    today = datetime.now().date()
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        sent = random.randint(0, 250) if i % 7 not in (0, 6) else 0
        result.append({
            "date": d,
            "sent": sent,
            "opened": int(sent * 0.38),
            "replies": 0,
            "clicks": int(sent * 0.05),
            "bounced": int(sent * 0.008),
        })
    return result
