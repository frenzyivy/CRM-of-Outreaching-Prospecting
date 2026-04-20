"""Email API endpoints — Instantly.ai + multi-tool (ConvertKit, Lemlist, Smartlead)."""

from fastapi import APIRouter, HTTPException, Query

from integrations.esp.instantly import (
    get_all_instantly_data,
    fetch_sequence_steps,
    fetch_campaign_analytics,
    fetch_daily_analytics,
)
from integrations.esp.convertkit import get_campaigns as ck_campaigns, get_daily_stats as ck_daily
from integrations.esp.lemlist import get_campaigns as ll_campaigns, get_daily_stats as ll_daily
from integrations.esp.smartlead import get_campaigns as sl_campaigns, get_daily_stats as sl_daily

TOOL_DISPATCH = {
    "convertkit": (ck_campaigns, ck_daily),
    "lemlist":    (ll_campaigns, ll_daily),
    "smartlead":  (sl_campaigns, sl_daily),
}

router = APIRouter(prefix="/api/email", tags=["email"])


@router.get("/overview")
def email_overview(
    date_from: str | None = Query(default=None, description="ISO date e.g. 2026-03-07"),
    date_to: str | None = Query(default=None, description="ISO date e.g. 2026-04-07"),
):
    data = get_all_instantly_data(start_date=date_from, end_date=date_to)
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "sequence_steps": data.get("sequence_steps", []),
        "error": data.get("error"),
    }


@router.get("/daily")
def email_daily(
    campaign_id: str | None = None,
    days: int = Query(default=30, ge=1, le=90),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    data = get_all_instantly_data(start_date=date_from, end_date=date_to)
    return {
        "daily": data.get("daily", []),
        "error": data.get("error"),
    }


@router.get("/countries")
def email_countries(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    data = get_all_instantly_data(start_date=date_from, end_date=date_to)
    return {
        "country_stats": data.get("country_stats", []),
        "error": data.get("error"),
    }


@router.get("/leads")
def email_leads(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    data = get_all_instantly_data(start_date=date_from, end_date=date_to)
    return {
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "specialty_stats": data.get("specialty_stats", []),
        "error": data.get("error"),
    }


@router.get("/refresh")
def email_refresh(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    data = get_all_instantly_data(force=True, start_date=date_from, end_date=date_to)
    return {
        "overview": data.get("overview", {}),
        "campaigns": data.get("campaigns", []),
        "campaign_analytics": data.get("campaign_analytics", []),
        "daily": data.get("daily", []),
        "country_stats": data.get("country_stats", []),
        "specialty_stats": data.get("specialty_stats", []),
        "leads": data.get("leads", []),
        "lead_status_breakdown": data.get("lead_status_breakdown", {}),
        "sequence_steps": data.get("sequence_steps", []),
        "error": data.get("error"),
    }


@router.get("/sync-status")
def email_sync_status():
    """Returns last sync metadata — time, errors, platforms synced."""
    from services.email_sync import get_sync_status
    return get_sync_status()


@router.get("/campaign/{campaign_id}")
def email_campaign_detail(
    campaign_id: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    """Per-campaign drill-down: step-level analytics + daily time series."""
    steps = fetch_sequence_steps(campaign_id)
    daily = fetch_daily_analytics(
        campaign_id=campaign_id,
        start_date=date_from,
        end_date=date_to,
    )
    # Get campaign-level summary from the full analytics list
    all_data = get_all_instantly_data(start_date=date_from, end_date=date_to)
    campaign_analytics = all_data.get("campaign_analytics", [])
    summary = next(
        (c for c in campaign_analytics if c.get("campaign_id") == campaign_id),
        None,
    )
    return {
        "campaign_id": campaign_id,
        "summary": summary,
        "sequence_steps": steps,
        "daily": daily,
    }


# ===========================================================================
# Open Intelligence endpoints
# These MUST appear before /{tool}/... routes so FastAPI doesn't treat
# "open-intelligence" as a {tool} path parameter.
# ===========================================================================

import logging as _logging

_oi_log = _logging.getLogger("open-intelligence")


@router.post("/open-intelligence/sync")
def oi_trigger_sync():
    """Manually trigger sync of open events from Instantly API into email_open_events."""
    try:
        from services.email_sync import _sync_open_events
        count = _sync_open_events()
        return {"status": "ok", "rows_inserted": count}
    except Exception as e:
        _oi_log.error("Open Intelligence sync failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from core.supabase_client import (
    get_open_events,
    get_template_tags,
    upsert_template_tag,
    update_template_tag as _update_tag,
    delete_template_tag,
    get_hot_leads,
)


class TagCreate(BaseModel):
    campaign_id: str
    step_number: int
    variant_id: str = "A"
    subject_line: Optional[str] = None
    body_preview: Optional[str] = None
    body_angle: str = "untagged"
    tagged_by: Optional[str] = None


class TagUpdate(BaseModel):
    body_angle: Optional[str] = None
    subject_line: Optional[str] = None
    body_preview: Optional[str] = None
    tagged_by: Optional[str] = None


@router.get("/open-intelligence/subject-lines")
def oi_subject_lines(
    date_from:   Optional[str] = Query(default=None),
    date_to:     Optional[str] = Query(default=None),
    campaign_id: Optional[str] = Query(default=None),
    country:     Optional[str] = Query(default=None),
    specialty:   Optional[str] = Query(default=None),
    sort_by:     str = Query(default="unique_opens"),
    sort_order:  str = Query(default="desc"),
):
    """Subject line leaderboard ranked by open performance."""
    events = get_open_events(date_from, date_to, campaign_id, country, specialty)
    tags = {
        (t["campaign_id"], t["step_number"], t["variant_id"]): t
        for t in get_template_tags()
    }

    agg: dict = {}
    for e in events:
        key = (
            e["campaign_id"],
            e["step_number"],
            e["variant_id"],
            e.get("subject_line", ""),
        )
        if key not in agg:
            tag = tags.get((e["campaign_id"], e["step_number"], e["variant_id"]), {})
            agg[key] = {
                "campaign_id":   e["campaign_id"],
                "campaign_name": e.get("campaign_name", ""),
                "step_number":   e["step_number"],
                "variant_id":    e["variant_id"],
                "subject_line":  e.get("subject_line", ""),
                "body_angle":    tag.get("body_angle", "untagged"),
                "body_preview":  tag.get("body_preview", ""),
                "_emails":       set(),
                "total_opens":   0,
                "_re_opens":     0,
            }
        row = agg[key]
        row["_emails"].add(e["lead_email"])
        row["total_opens"] += 1
        if e.get("open_number", 1) > 1:
            row["_re_opens"] += 1

    result = []
    for row in agg.values():
        unique = len(row.pop("_emails"))
        re_opens = row.pop("_re_opens")
        row["unique_opens"] = unique
        row["re_open_rate"] = round(re_opens / max(row["total_opens"], 1) * 100, 1)
        result.append(row)

    valid_sorts = {"unique_opens", "total_opens", "re_open_rate"}
    key = sort_by if sort_by in valid_sorts else "unique_opens"
    result.sort(key=lambda x: x.get(key, 0), reverse=(sort_order.lower() != "asc"))
    return {"items": result, "total": len(result)}


@router.get("/open-intelligence/ab-comparison")
def oi_ab_comparison(
    campaign_id: str = Query(...),
    step_number: int = Query(...),
):
    """Side-by-side A/B variant comparison for a campaign step."""
    events = get_open_events(campaign_id=campaign_id)
    step_events = [e for e in events if e["step_number"] == step_number]
    tags_by_variant = {
        t["variant_id"]: t
        for t in get_template_tags(campaign_id=campaign_id)
        if t["step_number"] == step_number
    }

    variants: dict[str, dict] = {}
    for e in step_events:
        v = e.get("variant_id", "A")
        if v not in variants:
            tag = tags_by_variant.get(v, {})
            variants[v] = {
                "variant_id":   v,
                "subject_line": e.get("subject_line") or tag.get("subject_line", ""),
                "body_angle":   tag.get("body_angle", "untagged"),
                "body_preview": tag.get("body_preview", ""),
                "_emails":      set(),
                "total_opens":  0,
            }
        variants[v]["_emails"].add(e["lead_email"])
        variants[v]["total_opens"] += 1

    result = []
    for v in variants.values():
        v["unique_opens"] = len(v.pop("_emails"))
        result.append(v)

    return {"campaign_id": campaign_id, "step_number": step_number, "variants": result}


@router.get("/open-intelligence/angles")
def oi_angles(
    date_from: Optional[str] = Query(default=None),
    date_to:   Optional[str] = Query(default=None),
    country:   Optional[str] = Query(default=None),
    specialty: Optional[str] = Query(default=None),
):
    """Body angle performance: opens aggregated by angle tag."""
    events = get_open_events(date_from, date_to, country=country, specialty=specialty)
    tag_map = {
        (t["campaign_id"], t["step_number"], t["variant_id"]): t.get("body_angle", "untagged")
        for t in get_template_tags()
    }

    agg: dict[str, dict] = {}
    for e in events:
        angle = tag_map.get((e["campaign_id"], e["step_number"], e["variant_id"]), "untagged")
        if angle not in agg:
            agg[angle] = {"body_angle": angle, "_emails": set(), "total_opens": 0}
        agg[angle]["_emails"].add(e["lead_email"])
        agg[angle]["total_opens"] += 1

    result = []
    for row in agg.values():
        row["unique_opens"] = len(row.pop("_emails"))
        result.append(row)
    result.sort(key=lambda x: x["unique_opens"], reverse=True)
    return {"items": result}


@router.get("/open-intelligence/step-performance")
def oi_step_performance(
    campaign_id: Optional[str] = Query(default=None),
    country:     Optional[str] = Query(default=None),
    specialty:   Optional[str] = Query(default=None),
):
    """Sequence step funnel: opens per step, enriched with sent counts from Instantly API."""
    events = get_open_events(campaign_id=campaign_id, country=country, specialty=specialty)

    step_agg: dict[int, dict] = {}
    for e in events:
        n = e["step_number"]
        if n not in step_agg:
            step_agg[n] = {"step_number": n, "_emails": set(), "total_opens": 0}
        step_agg[n]["_emails"].add(e["lead_email"])
        step_agg[n]["total_opens"] += 1

    # Enrich with sent counts from Instantly API when a specific campaign is selected
    sent_map: dict[int, int] = {}
    if campaign_id:
        try:
            for s in fetch_sequence_steps(campaign_id):
                sent_map[int(s.get("step_number", 0))] = int(s.get("emails_sent", 0))
        except Exception:
            pass

    result = []
    for n in sorted(step_agg.keys()):
        row = step_agg[n]
        unique = len(row.pop("_emails"))
        sent = sent_map.get(n, 0)
        result.append({
            "step_number":  n,
            "unique_opens": unique,
            "total_opens":  row["total_opens"],
            "emails_sent":  sent,
            "open_rate":    round(unique / sent * 100, 1) if sent else None,
        })
    return {"items": result}


@router.get("/open-intelligence/time-heatmap")
def oi_time_heatmap(
    date_from: Optional[str] = Query(default=None),
    date_to:   Optional[str] = Query(default=None),
    country:   Optional[str] = Query(default=None),
    specialty: Optional[str] = Query(default=None),
):
    """7×24 heatmap grid using lead-local timestamps. Excludes polled synthetic rows."""
    events = get_open_events(date_from, date_to, country=country, specialty=specialty)

    grid: dict[tuple, int] = {}
    for e in events:
        if e.get("device_type") == "polled":
            continue
        local_ts = e.get("opened_at_lead_local") or e.get("opened_at")
        if not local_ts:
            continue
        try:
            dt = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))
            cell = (dt.weekday(), dt.hour)  # 0=Mon…6=Sun
            grid[cell] = grid.get(cell, 0) + 1
        except Exception:
            pass

    cells = [
        {"day": d, "hour": h, "count": grid.get((d, h), 0)}
        for d in range(7)
        for h in range(24)
    ]
    return {"cells": cells, "max_count": max((c["count"] for c in cells), default=0)}


@router.get("/open-intelligence/peak-hours")
def oi_peak_hours(country: str = Query(...)):
    """Top 5 peak open-hour windows for a specific country."""
    events = get_open_events(country=country)

    hour_counts: dict[int, int] = {}
    for e in events:
        if e.get("device_type") == "polled":
            continue
        local_ts = e.get("opened_at_lead_local") or e.get("opened_at")
        if not local_ts:
            continue
        try:
            dt = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))
            hour_counts[dt.hour] = hour_counts.get(dt.hour, 0) + 1
        except Exception:
            pass

    ranked = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return {
        "country": country,
        "peak_hours": [{"hour": h, "count": c} for h, c in ranked],
    }


@router.get("/open-intelligence/insights")
def oi_insights(
    date_from: Optional[str] = Query(default=None),
    date_to:   Optional[str] = Query(default=None),
    country:   Optional[str] = Query(default=None),
    specialty: Optional[str] = Query(default=None),
):
    """Auto-generated plain-English insights [{type, message, priority}]."""
    events = get_open_events(date_from, date_to, country=country, specialty=specialty)

    if not events:
        return {"insights": [{"type": "info", "message": "No open events recorded yet. Open events are captured via webhook as leads open your emails.", "priority": 0}]}

    tag_map = {
        (t["campaign_id"], t["step_number"], t["variant_id"]): t.get("body_angle", "untagged")
        for t in get_template_tags()
    }

    hour_counts: dict[int, int] = {}
    country_counts: dict[str, int] = {}
    angle_emails: dict[str, set] = {}
    re_openers: dict[str, int] = {}
    untagged_combos: set = set()

    for e in events:
        # Peak hour
        if e.get("device_type") != "polled":
            local_ts = e.get("opened_at_lead_local") or e.get("opened_at")
            if local_ts:
                try:
                    dt = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))
                    hour_counts[dt.hour] = hour_counts.get(dt.hour, 0) + 1
                except Exception:
                    pass

        cntry = e.get("lead_country") or "Unknown"
        country_counts[cntry] = country_counts.get(cntry, 0) + 1

        angle = tag_map.get((e["campaign_id"], e["step_number"], e["variant_id"]), "untagged")
        angle_emails.setdefault(angle, set()).add(e["lead_email"])
        if angle == "untagged":
            untagged_combos.add((e["campaign_id"], e["step_number"], e["variant_id"]))

        if e.get("open_number", 1) > 1:
            re_openers[e["lead_email"]] = re_openers.get(e["lead_email"], 0) + 1

    insights = []

    if hour_counts:
        best_hour = max(hour_counts, key=hour_counts.__getitem__)
        insights.append({
            "type": "peak_hour",
            "message": f"Most opens occur around {best_hour:02d}:00 lead local time — schedule sends 30-60 min before for inbox timing.",
            "priority": 1,
        })

    if country_counts:
        top = max(country_counts, key=country_counts.__getitem__)
        insights.append({
            "type": "top_country",
            "message": f"{top} generates the most opens ({country_counts[top]} events).",
            "priority": 2,
        })

    if angle_emails:
        sorted_angles = sorted(
            ((k, len(v)) for k, v in angle_emails.items() if k != "untagged"),
            key=lambda x: x[1],
            reverse=True,
        )
        if sorted_angles:
            best_angle, best_count = sorted_angles[0]
            insights.append({
                "type": "best_angle",
                "message": f"'{best_angle}' angle drives the most unique openers ({best_count} leads).",
                "priority": 1,
            })

    hot_count = sum(1 for v in re_openers.values() if v >= 2)
    if hot_count:
        insights.append({
            "type": "hot_leads",
            "message": f"{hot_count} lead(s) re-opened emails multiple times — prioritise for personal follow-up.",
            "priority": 0,
        })

    if untagged_combos:
        insights.append({
            "type": "untagged",
            "message": f"{len(untagged_combos)} email template(s) are untagged. Click a row in the Subject Line Leaderboard to assign body-angle tags.",
            "priority": 3,
        })

    return {"insights": sorted(insights, key=lambda x: x["priority"])}


@router.get("/open-intelligence/hot-leads")
def oi_hot_leads():
    """Leads with 3+ re-opens on any single email — high engagement signal."""
    return {"items": get_hot_leads(min_reopens=3)}


@router.get("/open-intelligence/tags")
def oi_get_tags(campaign_id: Optional[str] = Query(default=None)):
    return {"items": get_template_tags(campaign_id=campaign_id)}


@router.post("/open-intelligence/tags")
def oi_create_tag(body: TagCreate):
    from datetime import timezone as _tz
    tag = body.model_dump()
    tag["tagged_at"] = datetime.now(_tz.utc).isoformat()
    return upsert_template_tag(tag)


@router.put("/open-intelligence/tags/{tag_id}")
def oi_update_tag(tag_id: str, body: TagUpdate):
    from datetime import timezone as _tz
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    updates["tagged_at"] = datetime.now(_tz.utc).isoformat()
    return _update_tag(tag_id, updates)


@router.delete("/open-intelligence/tags/{tag_id}")
def oi_delete_tag(tag_id: str):
    delete_template_tag(tag_id)
    return {"deleted": True, "tag_id": tag_id}


# ===========================================================================
# Multi-tool catch-all routes — MUST stay at the bottom
# ===========================================================================

@router.get("/{tool}/campaigns")
def get_tool_campaigns(tool: str):
    if tool not in TOOL_DISPATCH:
        raise HTTPException(status_code=400, detail=f"Unknown email tool: {tool}")
    get_campaigns_fn, _ = TOOL_DISPATCH[tool]
    campaigns = get_campaigns_fn()
    return {"tool": tool, "campaigns": campaigns, "error": None}


@router.get("/{tool}/daily")
def get_tool_daily(tool: str, days: int = Query(default=30, ge=1, le=90)):
    if tool not in TOOL_DISPATCH:
        raise HTTPException(status_code=400, detail=f"Unknown email tool: {tool}")
    _, get_daily_fn = TOOL_DISPATCH[tool]
    daily = get_daily_fn(days=days)
    return {"tool": tool, "daily": daily, "error": None}
