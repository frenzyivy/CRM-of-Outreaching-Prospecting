"""
Integration credential configuration and .env file helpers.
"""

import os


# Whitelist: integration_id → the exact env-var keys it owns
INTEGRATION_ENV_KEYS: dict[str, list[str]] = {
    # ── Already active ──
    "instantly":      ["INSTANTLY_API_KEY"],
    "supabase":       ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"],
    # ── Analytics ──
    "ga4":            ["GA4_MEASUREMENT_ID", "GA4_API_SECRET"],
    "google_search":  ["GSC_CLIENT_ID", "GSC_CLIENT_SECRET"],
    "mixpanel":       ["MIXPANEL_PROJECT_TOKEN", "MIXPANEL_API_SECRET"],
    "heap":           ["HEAP_APP_ID"],
    "hotjar":         ["HOTJAR_SITE_ID", "HOTJAR_API_KEY"],
    "segment":        ["SEGMENT_WRITE_KEY"],
    # ── Data & Enrichment ──
    "apollo":         ["APOLLO_API_KEY"],
    "clay":           ["CLAY_API_KEY"],
    "zoominfo":       ["ZOOMINFO_USERNAME", "ZOOMINFO_PASSWORD"],
    "linkedin":       ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    "hunter":         ["HUNTER_API_KEY"],
    "clearbit":       ["CLEARBIT_API_KEY"],
    "lusha":          ["LUSHA_API_KEY"],
    "snovio":         ["SNOVIO_USER_ID", "SNOVIO_API_SECRET"],
    "datagma":        ["DATAGMA_API_KEY"],
    "dropcontact":    ["DROPCONTACT_API_KEY"],
    "wiza":           ["WIZA_API_KEY"],
    "kaspr":          ["KASPR_API_KEY"],
    "phantombuster":  ["PHANTOMBUSTER_API_KEY"],
    # ── Email Outreach ──
    "lemlist":        ["LEMLIST_API_KEY"],
    "smartlead":      ["SMARTLEAD_API_KEY"],
    "woodpecker":     ["WOODPECKER_API_KEY"],
    "reply":          ["REPLY_API_KEY"],
    "mailshake":      ["MAILSHAKE_API_KEY"],
    # ── WhatsApp & Calls ──
    "whatsapp":       ["WHATSAPP_PHONE_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_VERIFY_TOKEN"],
    "retell":         ["RETELL_API_KEY"],
    # ── AI Agent (LLM) ──
    "anthropic":      ["ANTHROPIC_API_KEY"],
    "openai":         ["OPENAI_API_KEY"],
    # ── CRM ──
    "hubspot":        ["HUBSPOT_ACCESS_TOKEN"],
    "salesforce":     ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET",
                       "SALESFORCE_USERNAME", "SALESFORCE_PASSWORD"],
    "pipedrive":      ["PIPEDRIVE_API_TOKEN"],
    "close":          ["CLOSE_API_KEY"],
}


def env_path() -> str:
    """Return absolute path to the project .env file."""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


def read_env_file() -> dict[str, str]:
    """Parse the .env file into a dict (does not load into os.environ)."""
    result: dict[str, str] = {}
    path = env_path()
    if not os.path.exists(path):
        return result
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            result[key.strip()] = val.strip()
    return result


def write_env_keys(updates: dict[str, str]) -> None:
    """Update existing keys in-place; append new ones at the end.
    Preserves all comments, blank lines, and key ordering."""
    path = env_path()
    lines: list[str] = []
    if os.path.exists(path):
        with open(path, "r") as f:
            lines = f.readlines()

    written: set[str] = set()
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}\n")
            written.add(key)
        else:
            new_lines.append(line)

    for key, val in updates.items():
        if key not in written:
            new_lines.append(f"{key}={val}\n")

    with open(path, "w") as f:
        f.writelines(new_lines)
