"""
Email Accounts API — inbox management, platform allocations, analytics, and sync control.

Endpoints:
  GET    /api/email/accounts                      → all accounts + today's analytics
  GET    /api/email/accounts/{id}                 → single account + per-platform breakdown
  POST   /api/email/accounts                      → create new inbox
  PUT    /api/email/accounts/{id}                 → update global_daily_limit / warmup_score
  DELETE /api/email/accounts/{id}                 → delete inbox (cascades connections + snapshots)
  POST   /api/email/accounts/{id}/connections     → add / update platform connection
  PUT    /api/email/connections/{conn_id}          → update allocation or active flag
  DELETE /api/email/connections/{conn_id}          → remove platform connection
  GET    /api/email/analytics/overview             → global aggregated metrics for today
  GET    /api/email/analytics/platform/{platform} → per-platform metrics for today
  POST   /api/email/sync/trigger                  → run a manual sync cycle now
  GET    /api/email/sync/status                   → last sync timestamp + any errors
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.supabase_client import (
    get_client,
    get_email_accounts,
    get_email_account_by_email,
    create_email_account,
    update_email_account,
    get_platform_connections,
    upsert_platform_connection,
    delete_platform_connection,
    get_today_snapshots,
    get_analytics_today,
)

router = APIRouter(prefix="/api/email", tags=["email-accounts"])

# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

VALID_PLATFORMS = {"instantly", "convertkit", "lemlist", "smartlead"}


class EmailAccountCreateRequest(BaseModel):
    email: str
    global_daily_limit: int = 100
    warmup_score: int | None = None


class EmailAccountUpdateRequest(BaseModel):
    global_daily_limit: int | None = None
    warmup_score: int | None = None


class PlatformConnectionRequest(BaseModel):
    platform: str
    allocated_daily_limit: int
    platform_account_id: str | None = None
    is_active: bool = True


class ConnectionUpdateRequest(BaseModel):
    allocated_daily_limit: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Helper — merge today's analytics into account objects
# ---------------------------------------------------------------------------

def _enrich_accounts_with_analytics(
    accounts: list[dict],
    analytics: list[dict],
    snapshots: list[dict],
) -> list[dict]:
    """Attach today's analytics row and snapshots to each account dict."""
    analytics_map = {row["email_account_id"]: row for row in analytics}
    from collections import defaultdict
    snaps_map: dict[str, list[dict]] = defaultdict(list)
    for s in snapshots:
        snaps_map[s["email_account_id"]].append(s)

    for acct in accounts:
        acct["today"] = analytics_map.get(acct["id"])
        acct["snapshots_today"] = snaps_map.get(acct["id"], [])
    return accounts


# ---------------------------------------------------------------------------
# Account CRUD
# ---------------------------------------------------------------------------

@router.get("/accounts")
def list_email_accounts():
    """All email accounts with platform_connections, today's analytics, and snapshots."""
    accounts = get_email_accounts()
    analytics = get_analytics_today()
    snapshots = get_today_snapshots()
    return {"accounts": _enrich_accounts_with_analytics(accounts, analytics, snapshots)}


@router.get("/accounts/{account_id}")
def get_email_account(account_id: str):
    """Single account with platform_connections, today's snapshots, and analytics."""
    db = get_client()
    res = (
        db.table("email_accounts")
        .select("*, platform_connections(*)")
        .eq("id", account_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Email account not found")

    account = res.data[0]

    # Today's per-platform snapshots for this account
    from datetime import date
    today = date.today().isoformat()
    snaps_res = (
        db.table("email_sync_snapshots")
        .select("*")
        .eq("email_account_id", account_id)
        .eq("sync_date", today)
        .execute()
    )
    account["snapshots_today"] = snaps_res.data or []

    # Today's aggregated analytics
    analytics_res = (
        db.table("email_analytics_daily")
        .select("*")
        .eq("email_account_id", account_id)
        .eq("analytics_date", today)
        .execute()
    )
    account["today"] = analytics_res.data[0] if analytics_res.data else None

    return account


@router.post("/accounts", status_code=201)
def create_email_account_endpoint(body: EmailAccountCreateRequest):
    """Create a new email account. Returns 409 if email already exists."""
    # Check for duplicate
    existing = get_email_account_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail=f"Account already exists: {body.email}")
    try:
        account = create_email_account(
            email=body.email,
            global_daily_limit=body.global_daily_limit,
            warmup_score=body.warmup_score,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return account


@router.put("/accounts/{account_id}")
def update_email_account_endpoint(account_id: str, body: EmailAccountUpdateRequest):
    """Update global_daily_limit and/or warmup_score on an existing account."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_email_account(account_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Email account not found")
    return result


@router.delete("/accounts/{account_id}", status_code=204)
def delete_email_account_endpoint(account_id: str):
    """Delete an email account (cascades to platform_connections and snapshots)."""
    db = get_client()
    # Verify exists first
    res = db.table("email_accounts").select("id").eq("id", account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Email account not found")
    db.table("email_accounts").delete().eq("id", account_id).execute()


# ---------------------------------------------------------------------------
# Platform Connection CRUD
# ---------------------------------------------------------------------------

@router.post("/accounts/{account_id}/connections", status_code=201)
def add_platform_connection(account_id: str, body: PlatformConnectionRequest):
    """Add or update a platform connection for this inbox."""
    if body.platform not in VALID_PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{body.platform}'. Must be one of: {sorted(VALID_PLATFORMS)}"
        )
    # Verify account exists
    db = get_client()
    acct_res = db.table("email_accounts").select("id").eq("id", account_id).execute()
    if not acct_res.data:
        raise HTTPException(status_code=404, detail="Email account not found")

    connection = upsert_platform_connection(
        email_account_id=account_id,
        platform=body.platform,
        allocated_daily_limit=body.allocated_daily_limit,
        platform_account_id=body.platform_account_id,
        is_active=body.is_active,
    )
    return connection


@router.put("/connections/{conn_id}")
def update_connection(conn_id: str, body: ConnectionUpdateRequest):
    """Update allocation or active flag on a platform connection."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    db = get_client()
    # Verify exists
    res = db.table("platform_connections").select("id").eq("id", conn_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Platform connection not found")

    result = db.table("platform_connections").update(updates).eq("id", conn_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/connections/{conn_id}", status_code=204)
def remove_connection(conn_id: str):
    """Remove a platform connection by id."""
    db = get_client()
    res = db.table("platform_connections").select("id").eq("id", conn_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Platform connection not found")
    delete_platform_connection(conn_id)


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------

@router.get("/analytics/overview")
def analytics_overview():
    """
    Global aggregated metrics for today across all accounts and platforms.
    Weighted rates are computed over total_sent — never averaged.
    """
    analytics = get_analytics_today()
    accounts = get_email_accounts()

    total_sent = sum(r.get("total_sent", 0) for r in analytics)
    total_opened = sum(r.get("total_opened", 0) for r in analytics)
    total_clicked = sum(r.get("total_clicked", 0) for r in analytics)
    total_replied = sum(r.get("total_replied", 0) for r in analytics)
    total_bounced = sum(r.get("total_bounced", 0) for r in analytics)
    total_unsub = sum(r.get("total_unsubscribed", 0) for r in analytics)
    total_limit = sum(a.get("global_daily_limit", 0) for a in accounts)
    total_allocated = sum(
        sum(c.get("allocated_daily_limit", 0) for c in a.get("platform_connections", []))
        for a in accounts
    )

    def rate(num: int, denom: int) -> float:
        return round(num / denom * 100, 2) if denom > 0 else 0.0

    return {
        "total_accounts": len(accounts),
        "total_limit": total_limit,
        "total_allocated": total_allocated,
        "total_sent": total_sent,
        "remaining": total_limit - total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_replied": total_replied,
        "total_bounced": total_bounced,
        "total_unsubscribed": total_unsub,
        "open_rate": rate(total_opened, total_sent),
        "click_rate": rate(total_clicked, total_sent),
        "reply_rate": rate(total_replied, total_sent),
        "bounce_rate": rate(total_bounced, total_sent),
        "unsub_rate": rate(total_unsub, total_sent),
    }


@router.get("/analytics/platform/{platform}")
def analytics_by_platform(platform: str):
    """
    Today's metrics for a single platform, aggregated across all accounts connected to it.
    """
    if platform not in VALID_PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be one of: {sorted(VALID_PLATFORMS)}"
        )

    snapshots = get_today_snapshots()
    platform_snaps = [s for s in snapshots if s.get("platform") == platform]

    # Accounts connected to this platform
    accounts = get_email_accounts()
    connected_accounts = [
        a for a in accounts
        if any(c.get("platform") == platform for c in a.get("platform_connections", []))
    ]

    total_sent = sum(s.get("sent", 0) for s in platform_snaps)
    total_opened = sum(s.get("opened", 0) for s in platform_snaps)
    total_clicked = sum(s.get("clicked", 0) for s in platform_snaps)
    total_replied = sum(s.get("replied", 0) for s in platform_snaps)
    total_bounced = sum(s.get("bounced", 0) for s in platform_snaps)
    total_unsub = sum(s.get("unsubscribed", 0) for s in platform_snaps)

    # Allocated limit for this platform across all accounts
    total_allocated = sum(
        c.get("allocated_daily_limit", 0)
        for a in accounts
        for c in a.get("platform_connections", [])
        if c.get("platform") == platform
    )

    def rate(num: int, denom: int) -> float:
        return round(num / denom * 100, 2) if denom > 0 else 0.0

    return {
        "platform": platform,
        "connected_accounts": len(connected_accounts),
        "total_allocated": total_allocated,
        "total_sent": total_sent,
        "remaining": total_allocated - total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_replied": total_replied,
        "total_bounced": total_bounced,
        "total_unsubscribed": total_unsub,
        "open_rate": rate(total_opened, total_sent),
        "click_rate": rate(total_clicked, total_sent),
        "reply_rate": rate(total_replied, total_sent),
        "bounce_rate": rate(total_bounced, total_sent),
        "unsub_rate": rate(total_unsub, total_sent),
        "snapshots": platform_snaps,
    }


# ---------------------------------------------------------------------------
# Sync control
# ---------------------------------------------------------------------------

@router.post("/sync/trigger")
def trigger_sync():
    """Manually trigger a full sync cycle across all connected platforms."""
    try:
        from services.email_sync import run_sync_cycle, get_sync_status
        run_sync_cycle()
        return {"ok": True, "status": get_sync_status()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sync failed: {exc}")


@router.get("/sync/status")
def sync_status():
    """Return the last sync timestamp and any per-platform errors."""
    try:
        from services.email_sync import get_sync_status
        return get_sync_status()
    except ImportError:
        return {"last_sync": None, "errors": {}, "note": "email_sync service not loaded"}
