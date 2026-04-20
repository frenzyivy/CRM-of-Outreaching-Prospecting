"""
Excel → Instantly.ai Lead Sync Tool.
Compares Excel contacts against Instantly leads and pushes missing ones.
"""

import re

from services.excel_reader import get_contacts
from integrations.esp.instantly import fetch_all_leads, fetch_campaigns, _api_post, CAMPAIGN_STATUS_LABELS


def _is_valid_email(email: str) -> bool:
    """Basic email validation."""
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def compute_sync_diff(excel_path: str) -> dict:
    """
    Compare Excel contacts vs Instantly leads.
    Returns contacts in Excel that are NOT in Instantly.
    """
    try:
        contacts = get_contacts(excel_path)
        instantly_leads = fetch_all_leads()

        # Filter out error entries
        valid_instantly = [l for l in instantly_leads if "error" not in l]

        # Build set of lowercase emails already in Instantly
        instantly_emails = {l.get("email", "").lower().strip() for l in valid_instantly if l.get("email")}

        missing = []
        already_synced = 0

        for contact in contacts:
            email = str(contact.get("email", "")).strip()
            email_lower = email.lower()

            if not email:
                continue

            if email_lower in instantly_emails:
                already_synced += 1
                continue

            missing.append({
                "email": email,
                "first_name": str(contact.get("first_name", "")),
                "last_name": str(contact.get("last_name", "")),
                "company": str(contact.get("company", "")),
                "title": str(contact.get("title", "")),
                "phone": str(contact.get("phone", "")),
                "linkedin": str(contact.get("linkedin", "")),
                "notes": str(contact.get("notes", "")),
                "valid": _is_valid_email(email),
            })

        return {
            "missing_contacts": missing,
            "excel_total": len(contacts),
            "instantly_total": len(valid_instantly),
            "already_synced": already_synced,
            "missing_count": len(missing),
            "error": None,
        }
    except Exception as e:
        return {
            "missing_contacts": [],
            "excel_total": 0,
            "instantly_total": 0,
            "already_synced": 0,
            "missing_count": 0,
            "error": str(e),
        }


def fetch_campaigns_for_selection() -> list[dict]:
    """Get campaigns suitable for sync (Active or Paused only)."""
    campaigns = fetch_campaigns()
    return [
        c for c in campaigns
        if "error" not in c and c.get("status") in (1, 2)  # Active or Paused
    ]


def push_leads_to_instantly(leads: list[dict], campaign_id: str) -> dict:
    """
    Push leads to Instantly.ai via bulk add endpoint.
    Maps Excel fields to Instantly schema.

    Args:
        leads: List of contact dicts from compute_sync_diff
        campaign_id: Target campaign ID

    Returns:
        { pushed, skipped, failed, errors }
    """
    if not leads:
        return {"pushed": 0, "skipped": 0, "failed": 0, "errors": []}

    # Map Excel contacts to Instantly lead format
    instantly_leads = []
    skipped = 0
    for lead in leads:
        email = lead.get("email", "").strip()
        if not _is_valid_email(email):
            skipped += 1
            continue

        instantly_lead: dict = {
            "email": email,
            "first_name": lead.get("first_name", ""),
            "last_name": lead.get("last_name", ""),
            "company_name": lead.get("company", ""),
            "phone": lead.get("phone", ""),
        }

        # Extra fields go to custom_variables
        custom = {}
        if lead.get("title"):
            custom["title"] = lead["title"]
        if lead.get("linkedin"):
            custom["linkedin"] = lead["linkedin"]
        if lead.get("notes"):
            custom["notes"] = lead["notes"]
        custom["source"] = "excel_sync"

        instantly_lead["custom_variables"] = custom
        instantly_leads.append(instantly_lead)

    if not instantly_leads:
        return {"pushed": 0, "skipped": skipped, "failed": 0, "errors": ["No valid emails to push."]}

    # Batch in groups of 1000
    errors = []
    total_pushed = 0
    total_failed = 0

    for i in range(0, len(instantly_leads), 1000):
        batch = instantly_leads[i : i + 1000]
        try:
            result = _api_post("/leads/add", {
                "campaign_id": campaign_id,
                "skip_if_in_workspace": True,
                "leads": batch,
            })
            # The API returns the count of successfully added leads
            if isinstance(result, dict):
                total_pushed += result.get("upload_count", len(batch))
            else:
                total_pushed += len(batch)
        except Exception as e:
            total_failed += len(batch)
            errors.append(f"Batch {i // 1000 + 1}: {str(e)}")

    return {
        "pushed": total_pushed,
        "skipped": skipped,
        "failed": total_failed,
        "errors": errors,
    }
