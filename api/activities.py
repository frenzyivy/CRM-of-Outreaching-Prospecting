"""Activities API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from core.supabase_client import log_activity, get_activities
from api.schemas import ActivityCreate

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("")
def create_activity(body: ActivityCreate):
    if body.activity_type not in ("email", "call", "note"):
        raise HTTPException(status_code=400, detail="activity_type must be email, call, or note")

    activity_id = log_activity(body.lead_id, body.activity_type, body.description)
    return {"status": "ok", "activity_id": activity_id}


@router.get("")
def list_activities(
    lead_id: str | None = None,
    activity_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
):
    return get_activities(lead_id, activity_type, limit)
