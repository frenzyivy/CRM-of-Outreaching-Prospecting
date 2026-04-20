"""Pipeline API endpoints."""

import logging
import os

from fastapi import APIRouter, HTTPException

from core.supabase_client import get_client, get_pipeline_view, set_lead_stage, log_activity
from core.constants import PIPELINE_STAGES
from api.schemas import StageUpdate

logger = logging.getLogger("pipeline")

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("")
def pipeline():
    return get_pipeline_view()


@router.put("/{lead_id}/stage")
def update_stage(lead_id: str, body: StageUpdate):
    if body.stage not in PIPELINE_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Must be one of: {PIPELINE_STAGES}",
        )
    set_lead_stage(lead_id, body.stage)
    log_activity(lead_id, "stage_change", body.description or f"Stage changed to {body.stage}")
    return {"status": "ok", "stage": body.stage}


# ---------------------------------------------------------------------------
# Summary strip — weighted pipeline etc.
# ---------------------------------------------------------------------------

# Probability weights by stage (for weighted pipeline placeholder).
# When `deals` table lands in Phase 5 these become per-deal expected values.
STAGE_WEIGHTS: dict[str, float] = {
    "new":         0.05,
    "researched":  0.10,
    "email_sent":  0.15,
    "follow_up_1": 0.20,
    "follow_up_2": 0.25,
    "responded":   0.40,
    "meeting":     0.55,
    "proposal":    0.70,
    "free_trial":  0.80,
    "closed_won":  1.00,
    "closed_lost": 0.00,
}


def _avg_deal_size_eur() -> float:
    try:
        return float(os.getenv("AVG_DEAL_SIZE_EUR", "1200"))
    except (TypeError, ValueError):
        return 1200.0


@router.get("/summary")
def pipeline_summary():
    """
    Returns the numbers for the summary strip below the pipeline board.
    Deal-value metrics are placeholders (count × stage_weight × AVG_DEAL_SIZE_EUR)
    until the dedicated `deals` table is created in Phase 5.
    """
    client = get_client()
    summary: dict = {}

    # 1. Base summary view
    try:
        res = client.table("v_pipeline_summary").select("*").limit(1).execute()
        summary = (res.data or [{}])[0] or {}
    except Exception as e:
        logger.warning(f"v_pipeline_summary not available: {e}")
        summary = {}

    # 2. Stage counts for weighted-value placeholder
    stage_counts: dict[str, int] = {}
    try:
        # Group leads by their stage via lead_stages join
        # Supabase can't GROUP BY directly, so we fetch all and bucket
        raw = (
            client.table("lead_stages")
            .select("stage")
            .execute()
        )
        for row in raw.data or []:
            s = row.get("stage") or "new"
            stage_counts[s] = stage_counts.get(s, 0) + 1
        # leads without a stage row default to "new"
        total_leads = client.table("leads").select("id", count="exact").limit(1).execute()
        tracked = sum(stage_counts.values())
        missing = (total_leads.count or 0) - tracked
        if missing > 0:
            stage_counts["new"] = stage_counts.get("new", 0) + missing
    except Exception as e:
        logger.warning(f"Could not aggregate stage counts for summary: {e}")

    avg_deal = _avg_deal_size_eur()

    # Weighted pipeline: excludes closed_won (already won) + closed_lost (lost)
    weighted = 0.0
    for stage, count in stage_counts.items():
        if stage in ("closed_won", "closed_lost"):
            continue
        weight = STAGE_WEIGHTS.get(stage, 0.1)
        weighted += count * weight * avg_deal

    return {
        "open_leads": summary.get("open_leads") or 0,
        "won_leads": summary.get("won_leads") or 0,
        "closed_leads": summary.get("closed_leads") or 0,
        "cold_pool": summary.get("cold_pool") or 0,
        "stuck_leads": summary.get("stuck_leads") or 0,
        "close_rate_pct": float(summary.get("close_rate_pct") or 0),
        # --- Placeholder deal-value metrics ---
        "avg_deal_value_eur": avg_deal,
        "weighted_pipeline_eur": round(weighted, 2),
        "value_source": "placeholder",  # flips to "deals_table" in Phase 5
        "stage_counts": stage_counts,
    }
