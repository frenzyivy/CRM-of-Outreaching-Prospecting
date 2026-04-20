"""Dashboard API endpoints."""

from fastapi import APIRouter, Query

from core.supabase_client import (
    get_client,
    get_lead_count,
    get_today_stats,
    get_chart_data,
    get_expenses,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    date_range: str = Query(default="This Month"),
    country: str = Query(default="All"),
    company_type: str = Query(default="All"),
    pipeline_stage: str = Query(default="All"),
):
    from datetime import date as dt_date, timedelta

    # Resolve date range to date_from / date_to
    today = dt_date.today()
    date_from = None
    date_to = f"{today.isoformat()}T23:59:59"

    if date_range == "Today":
        date_from = f"{today.isoformat()}T00:00:00"
    elif date_range == "Last 2 Days":
        start = today - timedelta(days=1)
        date_from = f"{start.isoformat()}T00:00:00"
    elif date_range == "This Week":
        start = today - timedelta(days=today.weekday())  # Monday
        date_from = f"{start.isoformat()}T00:00:00"
    elif date_range == "This Month":
        start = today.replace(day=1)
        date_from = f"{start.isoformat()}T00:00:00"
    # "Custom" or unrecognized → no date filter (all time)

    # Map "All" to None for filters
    country_filter = None if country == "All" else country
    industry_filter = None if company_type == "All" else company_type
    stage_filter = None if pipeline_stage == "All" else pipeline_stage

    counts = get_lead_count(
        country=country_filter,
        industry=industry_filter,
        stage=stage_filter,
    )
    activity_stats = get_today_stats(date_from=date_from, date_to=date_to)

    stage_counts = counts.get("stage_counts", {})
    total = counts["total"]

    # Compute derived metrics from real data
    outreach_stages = sum(
        stage_counts.get(s, 0)
        for s in ["email_sent", "follow_up_1", "follow_up_2", "responded",
                   "meeting", "proposal", "closed_won", "closed_lost"]
    )
    responded_plus = sum(
        stage_counts.get(s, 0)
        for s in ["responded", "meeting", "proposal", "closed_won"]
    )
    response_rate = round((responded_plus / outreach_stages * 100), 1) if outreach_stages else 0
    conversion_rate = round((stage_counts.get("closed_won", 0) / total * 100), 1) if total else 0

    # Free trial = leads in "free_trial" stage
    free_trial_count = stage_counts.get("free_trial", 0)

    # Clients (Paid) = closed_won
    clients_paid = stage_counts.get("closed_won", 0)

    # Conversion: outreach → free trial
    outreach_to_trial = round((free_trial_count / outreach_stages * 100), 1) if outreach_stages else 0

    # Pull real revenue & expense totals from the expenses table
    expenses = get_expenses()
    total_spent = sum(
        e.get("total_inr") or e.get("amount") or 0 for e in expenses
    )
    # Revenue from closed_won deals (placeholder — extend with deal_value when available)
    revenue_generated = 0

    return {
        "total_leads": total,
        "total_companies": counts["with_company"],
        "total_contacts": counts["with_person"],
        "meetings_count": stage_counts.get("meeting", 0),
        "proposals_count": stage_counts.get("proposal", 0),
        "closed_won_count": stage_counts.get("closed_won", 0),
        "closed_lost_count": stage_counts.get("closed_lost", 0),
        "response_rate": response_rate,
        "conversion_rate": conversion_rate,
        "free_trial_count": free_trial_count,
        "clients_paid": clients_paid,
        "outreach_to_trial": outreach_to_trial,
        "revenue_generated": revenue_generated,
        "total_spent": total_spent,
        "stage_counts": stage_counts,
        **activity_stats,
    }


@router.get("/needs-attention")
def dashboard_needs_attention():
    """Return leads that need attention: unreplied, stale deals, bounced emails."""
    from datetime import datetime, timedelta

    db_client = get_client()
    items = []

    # 1. Bounced emails
    try:
        bounced = db_client.table("leads").select(
            "id, email, full_name, first_name, last_name, company_name, last_email_event_at"
        ).eq("email_bounced", True).limit(20).execute()
        for row in bounced.data or []:
            name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
            items.append({
                "id": row["id"],
                "type": "bounced",
                "lead_name": name,
                "email": row.get("email", ""),
                "detail": f"Email bounced — {row.get('company_name', 'Unknown company')}",
                "days_ago": 0,
            })
    except Exception:
        pass

    # 2. Stale deals — leads in meeting/proposal stage with no recent activity (7+ days)
    try:
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        for stage in ["meeting", "proposal"]:
            stale = db_client.table("leads").select(
                "id, email, full_name, first_name, last_name, company_name, lead_stages!inner(stage, updated_at)"
            ).eq("lead_stages.stage", stage).lt("lead_stages.updated_at", cutoff).limit(10).execute()
            for row in stale.data or []:
                name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                stage_data = row.get("lead_stages", {})
                updated = stage_data.get("updated_at", "") if isinstance(stage_data, dict) else ""
                days = 0
                if updated:
                    try:
                        days = (datetime.now() - datetime.fromisoformat(updated.replace("Z", "+00:00").replace("+00:00", ""))).days
                    except Exception:
                        days = 7
                items.append({
                    "id": row["id"],
                    "type": "stale",
                    "lead_name": name,
                    "email": row.get("email", ""),
                    "detail": f"In {stage} stage for {days}+ days — {row.get('company_name', '')}",
                    "days_ago": days,
                })
    except Exception:
        pass

    # 3. Unreplied — leads in email_sent/follow_up stages with no reply (3+ days)
    try:
        cutoff = (datetime.now() - timedelta(days=3)).isoformat()
        for stage in ["email_sent", "follow_up_1", "follow_up_2"]:
            unreplied = db_client.table("leads").select(
                "id, email, full_name, first_name, last_name, company_name, email_replies, lead_stages!inner(stage, updated_at)"
            ).eq("lead_stages.stage", stage).lt("lead_stages.updated_at", cutoff).limit(10).execute()
            for row in unreplied.data or []:
                if (row.get("email_replies") or 0) > 0:
                    continue
                name = row.get("full_name") or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                items.append({
                    "id": row["id"],
                    "type": "unreplied",
                    "lead_name": name,
                    "email": row.get("email", ""),
                    "detail": f"No reply after {stage.replace('_', ' ')} — {row.get('company_name', '')}",
                    "days_ago": 3,
                })
    except Exception:
        pass

    # Sort: bounced first, then stale, then unreplied
    priority = {"bounced": 0, "stale": 1, "unreplied": 2}
    items.sort(key=lambda x: (priority.get(x["type"], 9), -x["days_ago"]))

    return {"items": items[:30], "total": len(items)}


@router.get("/chart-data")
def dashboard_chart_data(days: int = Query(default=30, ge=1, le=365)):
    return get_chart_data(days)
