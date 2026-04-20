"""
Lead Leakage API — surfaces deals dying from neglect.

Endpoints:
- GET  /api/leakage/alerts              — 5-row list of leakage categories
- GET  /api/leakage/alerts/{type}/leads — full list of affected leads
- POST /api/leakage/alerts/{type}/bulk-action — apply nudge / draft / chase / re-engage

Reads from v_lead_leakage_alerts (created in migrations/phase2_pipeline_migration.sql).
Degrades to empty list if the view is missing — the UI shows an empty state.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.supabase_client import get_client, log_activity

logger = logging.getLogger("leakage")

router = APIRouter(prefix="/api/leakage", tags=["leakage"])


# Allowed alert types — mirror the view's UNIONed sections
ALERT_TYPES = {
    "stuck_followup2",
    "no_post_meeting_followup",
    "unanswered_positive_replies",
    "ghosted",
    "stale_proposals",
}

# CTA label per alert type (shown as primary button on each alert row)
ALERT_CTA = {
    "stuck_followup2":            {"action": "nudge",      "label": "Nudge →"},
    "no_post_meeting_followup":   {"action": "draft",      "label": "Draft →"},
    "unanswered_positive_replies":{"action": "reply",      "label": "Reply →"},
    "ghosted":                    {"action": "re_engage",  "label": "Re-engage →"},
    "stale_proposals":            {"action": "chase",      "label": "Chase →"},
}

# Severity badge color per alert (for the UI to decide accent color)
ALERT_SEVERITY: dict[str, Literal["danger", "warn", "brand"]] = {
    "stuck_followup2":            "warn",
    "no_post_meeting_followup":   "warn",
    "unanswered_positive_replies":"danger",
    "ghosted":                    "warn",
    "stale_proposals":            "danger",
}


@router.get("/alerts")
def list_alerts() -> dict[str, Any]:
    """Returns all 5 alert categories with counts. Always returns 5 rows even
    if some have count=0, so the UI row count is stable."""
    client = get_client()
    rows: list[dict] = []
    try:
        res = client.table("v_lead_leakage_alerts").select("*").execute()
        rows = res.data or []
    except Exception as e:
        logger.warning(f"v_lead_leakage_alerts not available: {e}")
        rows = []

    by_type = {r.get("alert_type"): r for r in rows}

    # Always emit all 5 categories in canonical order, even if some are empty
    canonical_order = [
        ("stuck_followup2",            "Leads stuck in Follow-up · 14+ days silent"),
        ("no_post_meeting_followup",   "Meetings · no follow-up touch logged"),
        ("unanswered_positive_replies","Responded · no reply from you in 24h"),
        ("ghosted",                    "Ghosted · no activity 7+ days"),
        ("stale_proposals",            "Proposals · no follow-up > 7 days"),
    ]
    alerts = []
    total = 0
    for alert_type, default_title in canonical_order:
        row = by_type.get(alert_type) or {}
        count = int(row.get("count") or 0)
        total += count
        alerts.append({
            "alert_type": alert_type,
            "title": row.get("title") or default_title,
            "count": count,
            "total_value": row.get("total_value"),  # NULL until deals table lands
            "severity": ALERT_SEVERITY[alert_type],
            "cta": ALERT_CTA[alert_type],
        })

    return {"alerts": alerts, "total": total}


@router.get("/alerts/{alert_type}/leads")
def alerts_leads(alert_type: str, limit: int = 50) -> dict[str, Any]:
    """Returns the leads affected by a single alert category."""
    if alert_type not in ALERT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown alert type: {alert_type}")

    client = get_client()
    leads = _fetch_affected_leads(client, alert_type, limit=limit)
    return {"alert_type": alert_type, "leads": leads, "count": len(leads)}


class BulkActionBody(BaseModel):
    lead_ids: list[str] | None = None       # if None, applies to all affected
    note: str | None = None


@router.post("/alerts/{alert_type}/bulk-action")
def bulk_action(alert_type: str, body: BulkActionBody) -> dict[str, Any]:
    """
    Logs a 'nudge pending' activity on each affected lead. Does NOT send
    messages directly — it queues the intent so downstream workers (email
    sender, WA sender) can pick it up.

    Conservative by design: drafts only, no outbound side-effects.
    """
    if alert_type not in ALERT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown alert type: {alert_type}")

    client = get_client()
    lead_ids = body.lead_ids
    if not lead_ids:
        affected = _fetch_affected_leads(client, alert_type, limit=500)
        lead_ids = [l["id"] for l in affected]

    cta = ALERT_CTA[alert_type]
    logged = 0
    for lead_id in lead_ids:
        try:
            log_activity(
                lead_id,
                "leakage_action_queued",
                body.note or f"{cta['action']} queued from leakage report ({alert_type})",
            )
            logged += 1
        except Exception as e:
            logger.warning(f"Could not log activity for lead {lead_id}: {e}")

    return {
        "alert_type": alert_type,
        "action": cta["action"],
        "queued": logged,
        "requested": len(lead_ids),
    }


# ---------------------------------------------------------------------------
# Internal: fetch affected leads per alert type
# ---------------------------------------------------------------------------

def _fetch_affected_leads(client, alert_type: str, limit: int) -> list[dict]:
    """
    Mirrors the per-category filter from v_lead_leakage_alerts. We can't pass
    structural filters to a view, so we re-derive from base tables.
    """
    now = datetime.now(timezone.utc)

    if alert_type == "stuck_followup2":
        # stage in follow_up_1/2 AND no touch in 14 days
        cutoff = now - timedelta(days=14)
        stages = ("follow_up_1", "follow_up_2")
    elif alert_type == "no_post_meeting_followup":
        cutoff = None
        stages = ("meeting",)
    elif alert_type == "unanswered_positive_replies":
        cutoff = now - timedelta(hours=24)
        stages = ("responded",)
    elif alert_type == "ghosted":
        cutoff = now - timedelta(days=7)
        stages = ("email_sent", "follow_up_1", "follow_up_2")
    elif alert_type == "stale_proposals":
        cutoff = now - timedelta(days=7)
        stages = ("proposal",)
    else:
        return []

    try:
        # Fetch candidates by stage
        res = (
            client.table("leads")
            .select("id, full_name, first_name, last_name, email, company_name, country, updated_at, lead_stages!inner(stage, updated_at)")
            .in_("lead_stages.stage", list(stages))
            .limit(limit)
            .execute()
        )
        candidates = res.data or []
    except Exception as e:
        logger.warning(f"Could not fetch candidates for {alert_type}: {e}")
        return []

    # Post-filter by last-touch cutoff (keeps view + endpoint consistent).
    # For Phase 2 we use leads.updated_at as a proxy for last-touch — later we
    # could query v_touchpoints per lead (more accurate but N queries).
    if cutoff is None:
        return _shape_leads(candidates, limit)

    filtered = []
    for c in candidates:
        updated = c.get("updated_at")
        if not updated:
            filtered.append(c)
            continue
        try:
            dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            if dt < cutoff:
                filtered.append(c)
        except (TypeError, ValueError):
            filtered.append(c)

    return _shape_leads(filtered, limit)


def _shape_leads(rows: list[dict], limit: int) -> list[dict]:
    out = []
    for r in rows[:limit]:
        name = (
            r.get("full_name")
            or " ".join(filter(None, [r.get("first_name"), r.get("last_name")]))
            or r.get("email")
            or "Unknown"
        )
        stage_row = r.get("lead_stages") or {}
        out.append({
            "id": r.get("id"),
            "name": name,
            "email": r.get("email"),
            "company_name": r.get("company_name"),
            "country": r.get("country"),
            "stage": stage_row.get("stage"),
            "last_stage_change_at": stage_row.get("updated_at"),
        })
    return out
