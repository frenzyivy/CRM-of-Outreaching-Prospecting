"""Integration credential management endpoints."""

import os

from fastapi import APIRouter, HTTPException

from api.config import INTEGRATION_ENV_KEYS, read_env_file, write_env_keys
from api.schemas import IntegrationConnectRequest, IntegrationDisconnectRequest

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/status")
def integrations_status():
    """Return which integrations are connected. Credential values are NEVER returned."""
    env = read_env_file()
    result: dict[str, dict] = {}
    for int_id, keys in INTEGRATION_ENV_KEYS.items():
        result[int_id] = {
            "connected": all(env.get(k, "").strip() for k in keys),
            "partial": any(env.get(k, "").strip() for k in keys),
        }
    return result


@router.post("/connect")
def integration_connect(body: IntegrationConnectRequest):
    """Save credentials to .env. Only whitelisted keys per integration are accepted."""
    allowed = INTEGRATION_ENV_KEYS.get(body.integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {body.integration_id}")

    to_write: dict[str, str] = {}
    for key, val in body.credentials.items():
        if key not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Key '{key}' is not allowed for '{body.integration_id}'. "
                       f"Allowed keys: {allowed}",
            )
        if val.strip():
            to_write[key] = val.strip()

    if not to_write:
        raise HTTPException(status_code=400, detail="No credentials provided.")

    write_env_keys(to_write)
    # Reload into os.environ so the running process picks them up immediately
    for k, v in to_write.items():
        os.environ[k] = v

    return {
        "status": "ok",
        "integration_id": body.integration_id,
        "keys_written": list(to_write.keys()),
    }


@router.get("/{integration_id}/credentials")
def integration_credentials(integration_id: str):
    """Return masked credential values for a connected integration."""
    allowed = INTEGRATION_ENV_KEYS.get(integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {integration_id}")
    env = read_env_file()
    result: dict[str, str] = {}
    for key in allowed:
        val = env.get(key, "").strip()
        if val:
            # Show last 4 chars so user knows which credential is set
            suffix = val[-4:] if len(val) >= 4 else val
            result[key] = f"***{suffix}"
        else:
            result[key] = ""
    return result


@router.post("/disconnect")
def integration_disconnect(body: IntegrationDisconnectRequest):
    """Clear an integration's credentials from .env (sets values to empty string)."""
    allowed = INTEGRATION_ENV_KEYS.get(body.integration_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown integration: {body.integration_id}")

    write_env_keys({k: "" for k in allowed})
    for k in allowed:
        os.environ.pop(k, None)

    return {"status": "ok", "integration_id": body.integration_id}
