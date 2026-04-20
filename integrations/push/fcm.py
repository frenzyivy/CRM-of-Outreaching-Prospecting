"""
Firebase Cloud Messaging (FCM) push-notification dispatcher.

Sends messages via the firebase_admin SDK using a service-account JSON file.
Configuration (.env):
  FCM_CREDENTIALS_PATH=/absolute/path/to/firebase-service-account.json
    -- or --
  FCM_CREDENTIALS_JSON='{"type":"service_account",...}'   # inline JSON

If neither is set, is_configured() returns False and send_to_tokens() no-ops
so notifications still work in-app via Supabase Realtime without FCM.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Iterable

logger = logging.getLogger("fcm")

_initialized = False
_init_failed = False


def _get_credentials_source() -> tuple[str, str] | None:
    """Returns ('path', path) or ('json', raw_json) or None."""
    path = os.getenv("FCM_CREDENTIALS_PATH", "").strip()
    if path and os.path.isfile(path):
        return ("path", path)
    raw = os.getenv("FCM_CREDENTIALS_JSON", "").strip()
    if raw:
        return ("json", raw)
    return None


def is_configured() -> bool:
    return _get_credentials_source() is not None


def _ensure_initialized() -> bool:
    """Lazy-initialize firebase_admin. Returns True if ready to send."""
    global _initialized, _init_failed
    if _initialized:
        return True
    if _init_failed:
        return False

    source = _get_credentials_source()
    if source is None:
        _init_failed = True
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials as fb_credentials

        if firebase_admin._apps:
            _initialized = True
            return True

        kind, value = source
        if kind == "path":
            cred = fb_credentials.Certificate(value)
        else:
            cred = fb_credentials.Certificate(json.loads(value))

        firebase_admin.initialize_app(cred)
        _initialized = True
        logger.info("FCM initialized.")
        return True
    except ImportError:
        logger.warning("firebase-admin not installed — FCM disabled. Run: pip install firebase-admin")
        _init_failed = True
        return False
    except Exception as e:
        logger.error(f"FCM initialization failed: {e}")
        _init_failed = True
        return False


def send_to_tokens(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> dict:
    """
    Send a push notification to one or more FCM tokens.
    Never raises — failures are logged and counted.
    Returns: {'sent': N, 'failed': N, 'invalid_tokens': [...]}.
    """
    result = {"sent": 0, "failed": 0, "invalid_tokens": []}
    token_list = [t for t in tokens if t]
    if not token_list:
        return result

    if not _ensure_initialized():
        return result

    try:
        from firebase_admin import messaging
    except ImportError:
        return result

    str_data = {k: str(v) for k, v in (data or {}).items()}

    for token in token_list:
        try:
            msg = messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
            )
            messaging.send(msg)
            result["sent"] += 1
        except Exception as e:
            err = str(e).lower()
            if "registration-token-not-registered" in err or "invalid-argument" in err:
                result["invalid_tokens"].append(token)
            result["failed"] += 1
            logger.warning(f"FCM send failed for token {token[:12]}…: {e}")

    return result
