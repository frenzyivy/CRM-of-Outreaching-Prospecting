"""
WhatsApp Business API Tool
Handles messaging via Meta WhatsApp Business API.

Required env vars:
  WHATSAPP_PHONE_ID      — WhatsApp Business phone number ID
  WHATSAPP_ACCESS_TOKEN   — Meta Graph API access token
  WHATSAPP_VERIFY_TOKEN   — Webhook verification token (you choose this)
"""

import os
import logging
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("whatsapp")

GRAPH_API_URL = "https://graph.facebook.com/v21.0"


def _get_config() -> dict:
    """Return WhatsApp config from env vars. Raises if not configured."""
    phone_id = os.getenv("WHATSAPP_PHONE_ID", "").strip()
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "").strip()

    if not phone_id or not access_token:
        raise ValueError("WhatsApp Business API not configured. Set WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN.")

    return {
        "phone_id": phone_id,
        "access_token": access_token,
        "verify_token": verify_token,
    }


def is_configured() -> bool:
    """Check if WhatsApp API credentials are set."""
    try:
        _get_config()
        return True
    except ValueError:
        return False


def send_template_message(to_phone: str, template_name: str, language: str = "en_US", components: list | None = None) -> dict:
    """
    Send a WhatsApp template message.

    Args:
        to_phone: Recipient phone in international format (e.g., "14155552671")
        template_name: Approved template name
        language: Template language code
        components: Optional template components (header, body params, etc.)

    Returns:
        API response dict with message ID
    """
    config = _get_config()
    url = f"{GRAPH_API_URL}/{config['phone_id']}/messages"
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json",
    }

    payload: dict = {
        "messaging_product": "whatsapp",
        "to": to_phone.lstrip("+").replace(" ", "").replace("-", ""),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        },
    }

    if components:
        payload["template"]["components"] = components

    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    logger.info(f"WhatsApp template sent to {to_phone}: {data.get('messages', [{}])[0].get('id', 'unknown')}")
    return data


def send_text_message(to_phone: str, text: str) -> dict:
    """
    Send a free-form text message (only within 24h conversation window).

    Args:
        to_phone: Recipient phone in international format
        text: Message body

    Returns:
        API response dict
    """
    config = _get_config()
    url = f"{GRAPH_API_URL}/{config['phone_id']}/messages"
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone.lstrip("+").replace(" ", "").replace("-", ""),
        "type": "text",
        "text": {"body": text},
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def get_business_profile() -> dict:
    """Get the WhatsApp Business profile info."""
    config = _get_config()
    url = f"{GRAPH_API_URL}/{config['phone_id']}/whatsapp_business_profile"
    headers = {"Authorization": f"Bearer {config['access_token']}"}
    params = {"fields": "about,address,description,email,profile_picture_url,websites,vertical"}

    response = requests.get(url, headers=headers, params=params, timeout=15)
    response.raise_for_status()
    return response.json()


def verify_webhook(mode: str, token: str, challenge: str) -> str | None:
    """
    Verify webhook subscription from Meta.
    Returns the challenge string if token matches, None otherwise.
    """
    config = _get_config()
    if mode == "subscribe" and token == config["verify_token"]:
        return challenge
    return None
