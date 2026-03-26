"""
Activity Logger Tool
High-level functions for logging outreach activities and stage changes.
"""

from tools.db_manager import log_activity, set_lead_stage


def log_email_sent(db_path: str, lead_type: str, lead_key: str, description: str = "") -> int:
    """Log that an email was sent to a lead."""
    return log_activity(db_path, lead_type, lead_key, "email", description)


def log_call_made(db_path: str, lead_type: str, lead_key: str, description: str = "") -> int:
    """Log that a call was made to a lead."""
    return log_activity(db_path, lead_type, lead_key, "call", description)


def log_note(db_path: str, lead_type: str, lead_key: str, description: str = "") -> int:
    """Log a note on a lead."""
    return log_activity(db_path, lead_type, lead_key, "note", description)


def change_stage(
    db_path: str, lead_type: str, lead_key: str, new_stage: str, description: str = ""
) -> None:
    """Change a lead's pipeline stage and log the change as an activity."""
    set_lead_stage(db_path, lead_type, lead_key, new_stage)
    log_activity(
        db_path,
        lead_type,
        lead_key,
        "stage_change",
        description or f"Stage changed to {new_stage}",
    )
