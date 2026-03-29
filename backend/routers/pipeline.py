"""Pipeline API endpoints."""

from fastapi import APIRouter, HTTPException

from core.supabase_client import get_pipeline_view, set_lead_stage, log_activity
from core.constants import PIPELINE_STAGES
from backend.schemas import StageUpdate

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
