"""
Email Sync Service
==================
Runs a sync cycle every 15 minutes (triggered by APScheduler in backend/app.py).

For each configured platform it:
  1. Fetches today's per-account sending/engagement data from the platform API
  2. Matches each account by email address to our email_accounts table
  3. Upserts a row in email_sync_snapshots
  4. Recomputes email_analytics_daily for every account that changed

The ESP connectors in integrations/esp/ handle the actual HTTP calls;
this service just orchestrates, normalises, and persists the results.
"""

import logging
import os
from datetime import date, datetime
from typing import Any

from core.supabase_client import (
    get_email_accounts,
    get_email_account_by_email,
    create_email_account,
    upsert_platform_connection,
    upsert_sync_snapshot,
    upsert_analytics_daily,
    get_today_snapshots,
    insert_sync_log,
    update_sync_log,
)

logger = logging.getLogger("email_sync")

# Track last sync metadata in memory (also exposed via /api/email/sync/status)
_sync_status: dict[str, Any] = {
    "last_sync_at": None,
    "last_sync_ok": None,
    "errors": [],
    "platforms_synced": [],
}


def get_sync_status() -> dict:
    return dict(_sync_status)


# ---------------------------------------------------------------------------
# Health helper
# ---------------------------------------------------------------------------

def get_health_status(global_limit: int, total_sent: int) -> str:
    """
    Returns 'healthy', 'near_limit', or 'maxed'.
    Near-limit threshold: 90% of global limit.
    """
    if global_limit <= 0:
        return "healthy"
    remaining = global_limit - total_sent
    if remaining <= 0:
        return "maxed"
    usage_pct = (total_sent / global_limit) * 100
    if usage_pct >= 90:
        return "near_limit"
    return "healthy"


# ---------------------------------------------------------------------------
# Rate calculation (always weighted, never average-of-averages)
# ---------------------------------------------------------------------------

def _rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


# ---------------------------------------------------------------------------
# Per-platform normalizers
# Each returns a list of dicts:
#   { email, sent, opened, clicked, replied, bounced, unsubscribed }
# ---------------------------------------------------------------------------

def _sync_instantly(today_str: str) -> list[dict]:
    """
    Fetch per-account daily analytics from Instantly.ai.
    Uses the /api/v2/campaigns/analytics/daily endpoint filtered by date.
    """
    try:
        import requests
        from integrations.esp import instantly as inst

        key = os.getenv("INSTANTLY_API_KEY", "")
        if not key:
            logger.warning("INSTANTLY_API_KEY not set — skipping Instantly sync")
            return []

        # Instantly v2 uses the raw API key as a Bearer token.
        # The key stored in .env is already in the correct base64 format.
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

        # Fetch accounts (to get email list and per-account daily limits)
        accts_resp = requests.get(
            "https://api.instantly.ai/api/v2/accounts",
            headers=headers,
            params={"limit": 100},
            timeout=15,
        )
        accts_resp.raise_for_status()
        accts_data = accts_resp.json()
        accounts_list = accts_data if isinstance(accts_data, list) else accts_data.get("items", [])

        # Build email → account map
        email_map = {a.get("email", "").lower(): a for a in accounts_list if a.get("email")}
        if not email_map:
            return []

        # Fetch daily analytics for today, one email at a time
        results: list[dict] = []
        for email_addr, acct in email_map.items():
            try:
                analytics_resp = requests.get(
                    "https://api.instantly.ai/api/v2/campaigns/analytics/daily",
                    headers=headers,
                    params={
                        "start_date": today_str,
                        "end_date": today_str,
                        "emails": email_addr,
                    },
                    timeout=15,
                )
                if analytics_resp.status_code != 200:
                    # No data for this account today — zero row still useful
                    results.append({
                        "email": email_addr,
                        "sent": 0, "opened": 0, "clicked": 0,
                        "replied": 0, "bounced": 0, "unsubscribed": 0,
                    })
                    continue

                days = analytics_resp.json()
                day_data = days[0] if isinstance(days, list) and days else {}

                results.append({
                    "email": email_addr,
                    "sent": int(day_data.get("sent", 0)),
                    "opened": int(day_data.get("unique_opened", day_data.get("opened", 0))),
                    "clicked": int(day_data.get("unique_clicks", day_data.get("clicks", 0))),
                    "replied": int(day_data.get("unique_replies", day_data.get("replies", 0))),
                    "bounced": int(day_data.get("bounced", 0)),
                    "unsubscribed": int(day_data.get("unsubscribed", 0)),
                })
            except Exception as e:
                logger.warning(f"Instantly: error fetching analytics for {email_addr}: {e}")

        return results

    except Exception as e:
        logger.error(f"Instantly sync failed: {e}")
        return []


def _sync_smartlead(today_str: str) -> list[dict]:
    """
    Fetch per-account daily analytics from Smartlead.
    Uses /api/v1/email-accounts to get accounts, then
    /api/v1/analytics/overview for aggregate stats.
    Per-account breakdown from /api/v1/campaigns/{id}/statistics.
    """
    try:
        import httpx

        api_key = os.getenv("SMARTLEAD_API_KEY", "")
        if not api_key:
            logger.warning("SMARTLEAD_API_KEY not set — skipping Smartlead sync")
            return []

        params = {"api_key": api_key}
        base = "https://server.smartlead.ai/api/v1"

        # Get all email accounts from Smartlead
        r = httpx.get(f"{base}/email-accounts/", params={**params, "offset": 0, "limit": 100}, timeout=15)
        r.raise_for_status()
        accounts = r.json() if isinstance(r.json(), list) else r.json().get("data", [])

        if not accounts:
            return []

        # Get all campaigns for today's stats
        campaigns_r = httpx.get(f"{base}/campaigns", params=params, timeout=15)
        campaigns_r.raise_for_status()
        campaigns = campaigns_r.json() if isinstance(campaigns_r.json(), list) else []

        # Aggregate per sender email across campaigns
        per_email: dict[str, dict] = {}

        for campaign in campaigns:
            cid = campaign.get("id")
            if not cid:
                continue
            try:
                stats_r = httpx.get(
                    f"{base}/campaigns/{cid}/analytics-by-date",
                    params={**params, "start_date": today_str, "end_date": today_str},
                    timeout=10,
                )
                if stats_r.status_code != 200:
                    continue
                daily = stats_r.json()
                # daily is a list of {date, sent_count, open_count, click_count, reply_count, bounce_count, unsubscribed_count}
                for row in (daily if isinstance(daily, list) else []):
                    # We don't have per-sender breakdown here — accumulate at campaign level
                    # and distribute evenly across connected accounts for this campaign
                    pass

                # Get email accounts for this campaign
                accts_r = httpx.get(
                    f"{base}/campaigns/{cid}/email-accounts",
                    params=params,
                    timeout=10,
                )
                if accts_r.status_code != 200:
                    continue
                campaign_accounts = accts_r.json() if isinstance(accts_r.json(), list) else []
                n = max(len(campaign_accounts), 1)

                for row in (daily if isinstance(daily, list) else []):
                    sent = int(row.get("sent_count", 0))
                    opens = int(row.get("open_count", 0))
                    clicks = int(row.get("click_count", 0))
                    replies = int(row.get("reply_count", 0))
                    bounces = int(row.get("bounce_count", 0))
                    unsubs = int(row.get("unsubscribed_count", 0))

                    for ca in campaign_accounts:
                        ea = (ca.get("from_email") or ca.get("email") or "").lower()
                        if not ea:
                            continue
                        if ea not in per_email:
                            per_email[ea] = {"sent": 0, "opened": 0, "clicked": 0,
                                             "replied": 0, "bounced": 0, "unsubscribed": 0}
                        per_email[ea]["sent"] += sent // n
                        per_email[ea]["opened"] += opens // n
                        per_email[ea]["clicked"] += clicks // n
                        per_email[ea]["replied"] += replies // n
                        per_email[ea]["bounced"] += bounces // n
                        per_email[ea]["unsubscribed"] += unsubs // n

            except Exception as e:
                logger.warning(f"Smartlead: error on campaign {cid}: {e}")

        # Also add any Smartlead accounts not seen in campaigns (zero row)
        for a in accounts:
            email_addr = (a.get("from_email") or a.get("email") or "").lower()
            if email_addr and email_addr not in per_email:
                per_email[email_addr] = {"sent": 0, "opened": 0, "clicked": 0,
                                          "replied": 0, "bounced": 0, "unsubscribed": 0}

        return [{"email": em, **metrics} for em, metrics in per_email.items()]

    except Exception as e:
        logger.error(f"Smartlead sync failed: {e}")
        return []


def _sync_lemlist(today_str: str) -> list[dict]:
    """
    Fetch per-account daily analytics from Lemlist.
    Uses the activities endpoint to group by sendUserEmail.
    """
    try:
        import httpx

        api_key = os.getenv("LEMLIST_API_KEY", "")
        if not api_key:
            logger.warning("LEMLIST_API_KEY not set — skipping Lemlist sync")
            return []

        auth = ("", api_key)
        base = "https://api.lemlist.com/api"

        # Fetch campaigns
        camps_r = httpx.get(f"{base}/campaigns", auth=auth, timeout=15)
        camps_r.raise_for_status()
        campaigns = camps_r.json() or []

        per_email: dict[str, dict] = {}

        event_field_map = {
            "emailsSent": "sent",
            "emailsOpened": "opened",
            "emailsClicked": "clicked",
            "emailsReplied": "replied",
            "emailsBounced": "bounced",
            "emailsUnsubscribed": "unsubscribed",
        }

        for campaign in campaigns:
            cid = campaign.get("_id")
            if not cid:
                continue
            try:
                for activity_type, metric_key in event_field_map.items():
                    act_r = httpx.get(
                        f"{base}/activities",
                        auth=auth,
                        params={"type": activity_type, "campaignId": cid},
                        timeout=10,
                    )
                    if act_r.status_code != 200:
                        continue
                    activities = act_r.json() if isinstance(act_r.json(), list) else []

                    for act in activities:
                        # Filter to today only
                        created = act.get("createdAt", "")
                        if today_str not in created:
                            continue
                        sender = (act.get("sendUserEmail") or "").lower()
                        if not sender:
                            continue
                        if sender not in per_email:
                            per_email[sender] = {"sent": 0, "opened": 0, "clicked": 0,
                                                  "replied": 0, "bounced": 0, "unsubscribed": 0}
                        per_email[sender][metric_key] += 1
            except Exception as e:
                logger.warning(f"Lemlist: error on campaign {cid}: {e}")

        return [{"email": em, **metrics} for em, metrics in per_email.items()]

    except Exception as e:
        logger.error(f"Lemlist sync failed: {e}")
        return []


def _sync_convertkit(today_str: str) -> list[dict]:
    """
    Fetch per-account data from ConvertKit.
    ConvertKit is a broadcast/newsletter platform — it doesn't have
    per-sender-inbox granularity in the same way as cold email tools.
    We aggregate broadcast stats for today and attach them to any
    email_accounts whose email matches a ConvertKit sender.
    """
    try:
        import httpx

        api_secret = os.getenv("CONVERTKIT_API_SECRET", "")
        if not api_secret:
            logger.warning("CONVERTKIT_API_SECRET not set — skipping ConvertKit sync")
            return []

        base = "https://api.convertkit.com/v3"
        params = {"api_secret": api_secret}

        # Get all broadcasts
        broadcasts_r = httpx.get(f"{base}/broadcasts", params=params, timeout=15)
        broadcasts_r.raise_for_status()
        broadcasts = broadcasts_r.json().get("broadcasts", [])

        # Aggregate stats across all broadcasts sent today
        today_totals: dict[str, int] = {
            "sent": 0, "opened": 0, "clicked": 0,
            "replied": 0, "bounced": 0, "unsubscribed": 0,
        }

        for broadcast in broadcasts:
            # Filter to broadcasts published/sent today
            published = broadcast.get("published_at") or broadcast.get("created_at") or ""
            if today_str not in published:
                continue

            bid = broadcast.get("id")
            if not bid:
                continue

            try:
                stats_r = httpx.get(
                    f"{base}/broadcasts/{bid}/stats",
                    params=params,
                    timeout=10,
                )
                if stats_r.status_code != 200:
                    continue
                stats = stats_r.json().get("broadcast", {})
                recipients = int(stats.get("recipients", 0))
                open_rate = float(stats.get("open_rate", 0))
                click_rate = float(stats.get("click_rate", 0))

                today_totals["sent"] += recipients
                today_totals["opened"] += round(recipients * open_rate)
                today_totals["clicked"] += round(recipients * click_rate)
                today_totals["unsubscribed"] += int(stats.get("unsubscribe_count", 0))
                # ConvertKit doesn't expose bounce/reply per-broadcast
            except Exception as e:
                logger.warning(f"ConvertKit: error fetching stats for broadcast {bid}: {e}")

        if today_totals["sent"] == 0:
            return []

        # Find all email_accounts connected to ConvertKit in our DB
        accounts = get_email_accounts()
        ck_accounts = [
            a for a in accounts
            if any(c["platform"] == "convertkit" for c in a.get("platform_connections", []))
        ]

        if not ck_accounts:
            return []

        # Distribute totals evenly across all ConvertKit-connected accounts
        n = max(len(ck_accounts), 1)
        results = []
        for acct in ck_accounts:
            results.append({
                "email": acct["email"],
                "sent": today_totals["sent"] // n,
                "opened": today_totals["opened"] // n,
                "clicked": today_totals["clicked"] // n,
                "replied": today_totals["replied"] // n,
                "bounced": today_totals["bounced"] // n,
                "unsubscribed": today_totals["unsubscribed"] // n,
            })
        return results

    except Exception as e:
        logger.error(f"ConvertKit sync failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Recompute daily analytics for one account
# ---------------------------------------------------------------------------

def recompute_daily_analytics(account: dict, today_str: str, snapshots: list[dict]) -> None:
    """
    Given an email_account dict and all today's snapshots,
    compute weighted aggregate metrics and upsert into email_analytics_daily.
    """
    account_id = account["id"]
    global_limit = account.get("global_daily_limit", 100)
    connections = account.get("platform_connections", [])
    total_allocated = sum(c.get("allocated_daily_limit", 0) for c in connections)

    # Filter snapshots for this account
    acct_snaps = [s for s in snapshots if s["email_account_id"] == account_id]

    total_sent = sum(s.get("sent", 0) for s in acct_snaps)
    total_opened = sum(s.get("opened", 0) for s in acct_snaps)
    total_clicked = sum(s.get("clicked", 0) for s in acct_snaps)
    total_replied = sum(s.get("replied", 0) for s in acct_snaps)
    total_bounced = sum(s.get("bounced", 0) for s in acct_snaps)
    total_unsubscribed = sum(s.get("unsubscribed", 0) for s in acct_snaps)

    upsert_analytics_daily(
        email_account_id=account_id,
        analytics_date=today_str,
        aggregated={
            "total_sent": total_sent,
            "total_opened": total_opened,
            "total_clicked": total_clicked,
            "total_replied": total_replied,
            "total_bounced": total_bounced,
            "total_unsubscribed": total_unsubscribed,
            "open_rate": _rate(total_opened, total_sent),
            "click_rate": _rate(total_clicked, total_sent),
            "reply_rate": _rate(total_replied, total_sent),
            "bounce_rate": _rate(total_bounced, total_sent),
            "unsub_rate": _rate(total_unsubscribed, total_sent),
            "global_limit": global_limit,
            "total_allocated": total_allocated,
            "remaining": max(global_limit - total_sent, 0),
        },
    )


# ---------------------------------------------------------------------------
# Sync one platform
# ---------------------------------------------------------------------------

PLATFORM_FETCHERS = {
    "instantly": _sync_instantly,
    "smartlead": _sync_smartlead,
    "lemlist": _sync_lemlist,
    "convertkit": _sync_convertkit,
}


def _get_or_create_account(email_addr: str, platform: str, accounts_by_email: dict[str, dict]) -> dict:
    """
    Return the email_account row for this address, creating it automatically
    if this is the first time we've seen it from any platform API.
    Also ensures a platform_connection row exists for the given platform.
    """
    account = accounts_by_email.get(email_addr)
    if account is None:
        logger.info(f"Auto-creating email_account for {email_addr} (discovered via {platform})")
        account = create_email_account(email=email_addr, global_daily_limit=100)
        accounts_by_email[email_addr] = account

    # Ensure a platform_connection row exists (default 0 allocation — user can edit later)
    connections = account.get("platform_connections", [])
    has_conn = any(c.get("platform") == platform for c in connections)
    if not has_conn:
        logger.info(f"Auto-creating platform_connection: {email_addr} → {platform}")
        conn = upsert_platform_connection(
            email_account_id=account["id"],
            platform=platform,
            allocated_daily_limit=0,
        )
        account.setdefault("platform_connections", []).append(conn)

    return account


def sync_platform(platform: str, today_str: str, accounts_by_email: dict[str, dict]) -> list[str]:
    """
    Run sync for one platform.
    Auto-creates email_account + platform_connection rows for any new inboxes
    discovered from the platform API.
    Returns list of account_ids that were updated (for recompute step).
    """
    fetcher = PLATFORM_FETCHERS.get(platform)
    if fetcher is None:
        logger.warning(f"Unknown platform: {platform}")
        return []

    platform_data = fetcher(today_str)
    updated_ids: list[str] = []

    for row in platform_data:
        email_addr = row.get("email", "").lower()
        if not email_addr:
            continue

        account = _get_or_create_account(email_addr, platform, accounts_by_email)

        metrics = {
            "sent": row.get("sent", 0),
            "opened": row.get("opened", 0),
            "clicked": row.get("clicked", 0),
            "replied": row.get("replied", 0),
            "bounced": row.get("bounced", 0),
            "unsubscribed": row.get("unsubscribed", 0),
        }

        upsert_sync_snapshot(
            email_account_id=account["id"],
            platform=platform,
            sync_date=today_str,
            metrics=metrics,
        )
        updated_ids.append(account["id"])

    return updated_ids


# ---------------------------------------------------------------------------
# Full sync cycle (called by APScheduler every 15 min)
# ---------------------------------------------------------------------------

def run_sync_cycle() -> dict:
    """
    Main entry point. Called by the scheduler.
    Returns a summary dict. Persists a row to instantly_sync_log for debugging.
    """
    global _sync_status

    today_str = date.today().isoformat()
    started_at = datetime.now().isoformat()
    logger.info(f"Email sync cycle started — {today_str}")

    errors: list[str] = []
    platforms_synced: list[str] = []
    records_fetched = 0

    # Insert a "running" log row so the frontend can see sync in progress
    log_row: dict = {}
    try:
        log_row = insert_sync_log({
            "sync_type": "incremental",
            "started_at": started_at,
            "status": "running",
        })
    except Exception as e:
        logger.warning(f"Could not insert sync log row: {e}")

    log_id: str = log_row.get("id", "")

    # Load all email accounts once
    try:
        accounts = get_email_accounts()
    except Exception as e:
        msg = f"Failed to load email accounts: {e}"
        logger.error(msg)
        _sync_status = {
            "last_sync_at": started_at,
            "last_sync_ok": False,
            "errors": [msg],
            "platforms_synced": [],
        }
        if log_id:
            try:
                update_sync_log(log_id, {
                    "status": "failed",
                    "completed_at": datetime.now().isoformat(),
                    "error_message": msg,
                })
            except Exception:
                pass
        return _sync_status

    # Build lookup map: email → account (may start empty; platforms auto-populate it)
    accounts_by_email: dict[str, dict] = {a["email"].lower(): a for a in accounts}

    # Sync each platform
    all_updated_ids: set[str] = set()
    for platform in ["instantly", "smartlead", "lemlist", "convertkit"]:
        try:
            updated = sync_platform(platform, today_str, accounts_by_email)
            all_updated_ids.update(updated)
            platforms_synced.append(platform)
            records_fetched += len(updated)
            logger.info(f"  {platform}: {len(updated)} accounts updated")
        except Exception as e:
            msg = f"{platform} sync error: {e}"
            logger.error(msg)
            errors.append(msg)

    # Recompute daily analytics for all accounts that had snapshots upserted.
    records_upserted = 0
    try:
        snapshots = get_today_snapshots()
        for account in accounts_by_email.values():
            if account["id"] in all_updated_ids:
                try:
                    recompute_daily_analytics(account, today_str, snapshots)
                    records_upserted += 1
                except Exception as e:
                    msg = f"Recompute failed for {account['email']}: {e}"
                    logger.error(msg)
                    errors.append(msg)
    except Exception as e:
        msg = f"Failed to load snapshots for recompute: {e}"
        logger.error(msg)
        errors.append(msg)

    completed_at = datetime.now().isoformat()
    _sync_status = {
        "last_sync_at": completed_at,
        "last_sync_ok": len(errors) == 0,
        "errors": errors,
        "platforms_synced": platforms_synced,
        "records_fetched": records_fetched,
        "records_upserted": records_upserted,
    }

    # Update the log row with the final status
    if log_id:
        try:
            update_sync_log(log_id, {
                "status": "success" if not errors else "partial",
                "completed_at": completed_at,
                "records_fetched": records_fetched,
                "records_upserted": records_upserted,
                "error_message": "; ".join(errors) if errors else None,
            })
        except Exception as e:
            logger.warning(f"Could not update sync log row: {e}")

    # Supplement open events from poll (for leads whose opens predate webhook config)
    try:
        oi_inserted = _sync_open_events()
        if oi_inserted:
            logger.info(f"Open Intelligence: {oi_inserted} synthetic open-event rows inserted")
    except Exception as e:
        logger.warning(f"Open event poll supplement skipped: {e}")

    logger.info(
        f"Email sync complete — {len(all_updated_ids)} accounts updated, "
        f"{len(errors)} errors"
    )
    return _sync_status


# ---------------------------------------------------------------------------
# Open Intelligence — comprehensive sync of open events from Instantly API
# ---------------------------------------------------------------------------

def _sync_open_events() -> int:
    """
    Syncs open event data from Instantly.ai API into email_open_events.

    Strategy: For each lead with email_open_count > 0, creates one row per
    open event. Uses campaign analytics + step analytics to enrich with
    campaign_name and step info. Uses daily analytics to assign approximate
    timestamps when exact webhook times aren't available.

    Skips leads already synced (existing rows in email_open_events).
    Returns count of rows inserted.
    """
    from datetime import datetime, timezone as _tz, timedelta
    from core.supabase_client import upsert_open_event, get_client as _db
    from integrations.esp.instantly import (
        fetch_campaign_analytics,
        fetch_sequence_steps,
        fetch_daily_analytics,
    )

    db = _db()
    inserted = 0

    # 1. Fetch all leads with open counts
    leads = fetch_all_leads(max_pages=50)
    if not leads or (len(leads) == 1 and "error" in leads[0]):
        logger.warning("_sync_open_events: could not fetch leads")
        return 0

    # 2. Build campaign name map from campaign analytics
    campaign_analytics = fetch_campaign_analytics()
    campaign_names: dict[str, str] = {}
    for ca in campaign_analytics:
        if "error" not in ca:
            campaign_names[ca.get("campaign_id", "")] = ca.get("campaign_name", "")

    # 3. Build step analytics per campaign (for step distribution)
    step_cache: dict[str, list[dict]] = {}

    # 4. Build daily analytics per campaign (for timestamp distribution)
    daily_cache: dict[str, list[dict]] = {}

    # 5. Get all existing lead+campaign combos to skip
    existing_combos: set[tuple[str, str]] = set()
    try:
        existing_rows = (
            db.table("email_open_events")
            .select("lead_email, campaign_id")
            .limit(5000)
            .execute()
        )
        for r in (existing_rows.data or []):
            existing_combos.add((r["lead_email"], r["campaign_id"]))
    except Exception:
        pass

    # 6. Process each lead with opens
    for lead in leads:
        open_count = lead.get("email_open_count", 0)
        if not open_count:
            continue

        email = (lead.get("email") or "").lower().strip()
        campaign_id = lead.get("campaign_id", "")
        if not email or not campaign_id:
            continue

        # Skip if already synced
        if (email, campaign_id) in existing_combos:
            continue

        campaign_name = campaign_names.get(campaign_id, "")

        # Fetch step analytics for this campaign (cached)
        if campaign_id not in step_cache:
            try:
                step_cache[campaign_id] = fetch_sequence_steps(campaign_id)
            except Exception:
                step_cache[campaign_id] = []

        steps = step_cache[campaign_id]

        # Fetch daily analytics for this campaign (cached) — for timestamps
        if campaign_id not in daily_cache:
            try:
                daily_cache[campaign_id] = fetch_daily_analytics(
                    campaign_id=campaign_id, days=90,
                )
            except Exception:
                daily_cache[campaign_id] = []

        daily = daily_cache[campaign_id]

        # Find days with opens to use as approximate timestamps
        open_days = [
            d["date"] for d in daily
            if d.get("opened", 0) > 0 and d.get("date")
        ]
        # Sort by date descending (most recent first)
        open_days.sort(reverse=True)

        # Determine step to assign — use step 1 as default, or distribute
        # based on which steps have opens in the analytics
        step_number = 1
        subject_line = None
        if steps:
            # Find the step with the most opens that this lead likely opened
            open_steps = [s for s in steps if s.get("unique_opens", 0) > 0]
            if open_steps:
                # Assign to step with highest opens (most probable)
                step_number = open_steps[0].get("step_number", 1)

        # Create one event row per open_count, each with a slightly
        # different timestamp so they don't violate the unique constraint
        for i in range(min(open_count, 10)):  # Cap at 10 to avoid flooding
            # Assign approximate timestamp from daily analytics
            if open_days:
                # Distribute opens across known open days
                day_idx = i % len(open_days)
                # Add hours offset so multiple opens on same day don't collide
                base_ts = datetime.fromisoformat(open_days[day_idx] + "T09:00:00+00:00")
                opened_at = (base_ts + timedelta(hours=i)).isoformat()
            else:
                # Fallback: use recent timestamps with hour offsets
                opened_at = (
                    datetime.now(_tz.utc) - timedelta(days=i, hours=i)
                ).isoformat()

            event_row = {
                "lead_email":     email,
                "campaign_id":    campaign_id,
                "campaign_name":  campaign_name,
                "step_number":    step_number,
                "variant_id":     "A",
                "subject_line":   subject_line,
                "opened_at":      opened_at,
                "open_number":    i + 1,
                "lead_country":   lead.get("country"),
                "lead_specialty": lead.get("specialty"),
                "device_type":    "api_sync",
            }
            try:
                upsert_open_event(event_row)
                inserted += 1
            except Exception:
                pass

        existing_combos.add((email, campaign_id))

    return inserted
