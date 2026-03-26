"""Notifications API endpoints."""

from fastapi import APIRouter, Query

from core.supabase_client import (
    get_notifications,
    mark_notification_read as db_mark_read,
    mark_all_notifications_read as db_mark_all_read,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
):
    return get_notifications(unread_only=unread_only, limit=limit)


@router.put("/{notification_id}/read")
def mark_read(notification_id: str):
    db_mark_read(notification_id)
    return {"status": "ok"}


@router.put("/read-all")
def mark_all_read():
    db_mark_all_read()
    return {"status": "ok"}
