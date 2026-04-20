"""Device registration endpoints for FCM push notifications."""

from fastapi import APIRouter, Depends, HTTPException

from core.supabase_client import register_user_device, unregister_user_device
from api.auth import get_current_user
from api.schemas import DeviceRegisterRequest, DeviceUnregisterRequest

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.post("/register")
def register_device(body: DeviceRegisterRequest, user: dict = Depends(get_current_user)):
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user id in token")
    if body.platform not in ("android", "ios", "web"):
        raise HTTPException(status_code=400, detail="platform must be android, ios, or web")
    register_user_device(user_id, body.fcm_token, body.platform)
    return {"status": "ok"}


@router.post("/unregister")
def unregister_device(body: DeviceUnregisterRequest):
    unregister_user_device(body.fcm_token)
    return {"status": "ok"}
