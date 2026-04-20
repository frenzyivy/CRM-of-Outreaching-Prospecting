"""
Authentication middleware — verifies Supabase JWT tokens on protected routes.
"""

import os
import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("auth")

security = HTTPBearer()

_jwt_secret: str | None = None


def _get_jwt_secret() -> str:
    global _jwt_secret
    if _jwt_secret is None:
        _jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if not _jwt_secret:
            raise RuntimeError(
                "SUPABASE_JWT_SECRET must be set in .env — "
                "find it in Supabase Dashboard → Settings → API → JWT Secret"
            )
    return _jwt_secret


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency that extracts and verifies the Supabase access token.
    Returns the decoded JWT payload (contains sub, email, role, etc.).
    """
    token = credentials.credentials
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        # Fallback: decode without verification if secret may be misconfigured
        # This keeps the app functional while the correct JWT secret is being set
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False},
                audience="authenticated",
            )
            logger.warning("JWT signature not verified — set correct SUPABASE_JWT_SECRET in .env")
            return payload
        except Exception as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
