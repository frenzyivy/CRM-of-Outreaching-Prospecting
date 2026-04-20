"""
Lead Merger Tool
Merges Excel lead data with SQLite CRM metadata (pipeline stages, activities).
"""

from collections import defaultdict

from services.excel_reader import get_all_leads, get_companies, get_contacts, get_lead_records
from services.db_manager import get_all_stages, get_activities


PIPELINE_STAGES = [
    "new",
    "researched",
    "email_sent",
    "follow_up_1",
    "follow_up_2",
    "responded",
    "meeting",
    "proposal",
    "closed_won",
    "closed_lost",
]

STAGE_LABELS = {
    "new": "New",
    "researched": "Researched",
    "email_sent": "Email Sent",
    "follow_up_1": "Follow-up 1",
    "follow_up_2": "Follow-up 2",
    "responded": "Responded",
    "meeting": "Meeting",
    "proposal": "Proposal",
    "closed_won": "Closed (Won)",
    "closed_lost": "Closed (Lost)",
}


def _build_stage_map(db_path: str) -> dict[str, str]:
    """Build a lookup: (lead_type:lead_key) -> stage."""
    stages = get_all_stages(db_path)
    return {f"{s['lead_type']}:{s['lead_key']}": s["stage"] for s in stages}


def merge_leads_with_stages(
    excel_path: str, db_path: str, lead_type: str | None = None
) -> list[dict]:
    """
    Get leads from Excel and attach their pipeline stage from SQLite.
    Leads without a stage record default to 'new'.
    """
    if lead_type == "company":
        leads = get_companies(excel_path)
    elif lead_type == "contact":
        leads = get_contacts(excel_path)
    elif lead_type == "lead":
        leads = get_lead_records(excel_path)
    else:
        leads = get_all_leads(excel_path)

    stage_map = _build_stage_map(db_path)

    for lead in leads:
        key = f"{lead['lead_type']}:{lead['id']}"
        lead["stage"] = stage_map.get(key, "new")
        lead["stage_label"] = STAGE_LABELS.get(lead["stage"], lead["stage"])

    return leads


def get_pipeline_view(excel_path: str, db_path: str) -> dict:
    """
    Get all leads grouped by pipeline stage.
    Returns { stages: { stage_name: [leads] }, stage_counts: { stage_name: int }, stage_order: [...] }
    """
    leads = merge_leads_with_stages(excel_path, db_path)

    grouped: dict[str, list] = defaultdict(list)
    for lead in leads:
        grouped[lead["stage"]].append(lead)

    stage_counts = {stage: len(grouped.get(stage, [])) for stage in PIPELINE_STAGES}

    return {
        "stages": {stage: grouped.get(stage, []) for stage in PIPELINE_STAGES},
        "stage_counts": stage_counts,
        "stage_order": PIPELINE_STAGES,
        "stage_labels": STAGE_LABELS,
    }


def get_lead_detail(
    excel_path: str, db_path: str, lead_type: str, lead_id: str
) -> dict | None:
    """Get a single lead with full detail including activity history."""
    if lead_type == "company":
        leads = get_companies(excel_path)
    elif lead_type == "lead":
        leads = get_lead_records(excel_path)
    else:
        leads = get_contacts(excel_path)

    lead = next((l for l in leads if l["id"] == lead_id), None)
    if not lead:
        return None

    stage_map = _build_stage_map(db_path)
    key = f"{lead['lead_type']}:{lead['id']}"
    lead["stage"] = stage_map.get(key, "new")
    lead["stage_label"] = STAGE_LABELS.get(lead["stage"], lead["stage"])

    # Attach activity history
    lead["activities"] = get_activities(db_path, lead_type=lead_type, lead_key=lead_id)

    return lead
