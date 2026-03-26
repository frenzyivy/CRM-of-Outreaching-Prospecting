"""
Lead Ingestion Agent
Parses CSV/Excel files from any source (drag-drop UI or folder watch),
deduplicates against Supabase, inserts new leads, and auto-pushes to Instantly.ai.
"""

import io
import os
import re
from pathlib import Path
from typing import Any

import pandas as pd

from tools.supabase_client import upsert_lead, mark_lead_synced, get_client
from tools.instantly import _api_post, fetch_campaigns

# ---------------------------------------------------------------------------
# Column name aliases — maps any common header variant to our standard name
# ---------------------------------------------------------------------------
COLUMN_MAP: dict[str, str] = {
    # email
    "email": "email",
    "email_address": "email",
    "work_email": "email",
    "business_email": "email",
    # first name
    "first_name": "first_name",
    "firstname": "first_name",
    "first": "first_name",
    # last name
    "last_name": "last_name",
    "lastname": "last_name",
    "last": "last_name",
    # full name
    "full_name": "full_name",
    "name": "full_name",
    "contact_name": "full_name",
    # company
    "company": "company_name",
    "company_name": "company_name",
    "organization": "company_name",
    "employer": "company_name",
    "account_name": "company_name",
    # title
    "title": "title",
    "job_title": "title",
    "position": "title",
    "role": "title",
    # phone
    "phone": "phone",
    "phone_number": "phone",
    "mobile": "phone",
    "cell": "phone",
    # linkedin
    "linkedin": "linkedin",
    "linkedin_url": "linkedin",
    "linkedin_profile": "linkedin",
    # website
    "website": "website",
    "url": "website",
    "domain": "website",
    # location
    "city": "city",
    "state": "state",
    "country": "country",
    "location": "city",
    # industry
    "industry": "industry",
    "vertical": "industry",
    "sector": "industry",
    # notes
    "notes": "notes",
    "note": "notes",
    "comments": "notes",
}

LEAD_TYPE_FIELDS = {
    "contact": {"email", "first_name", "last_name", "full_name", "title", "phone", "linkedin"},
    "company": {"company_name", "website", "industry", "city", "state", "country"},
    "lead": {"email", "first_name", "last_name", "company_name", "title"},
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to standard names using the alias map."""
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(r"[^\w\s]", "", regex=True)
        .str.replace(r"\s+", "_", regex=True)
    )
    df = df.rename(columns={k: v for k, v in COLUMN_MAP.items() if k in df.columns})
    return df


def _is_valid_email(email: Any) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def _detect_lead_type(row: dict) -> str:
    """Guess lead_type from which fields are populated."""
    has_email = bool(row.get("email"))
    has_person = bool(row.get("first_name") or row.get("last_name") or row.get("full_name"))
    has_company_only = bool(row.get("company_name")) and not has_person and not has_email

    if has_company_only:
        return "company"
    if has_person or has_email:
        return "contact"
    return "lead"


def _parse_dataframe(df: pd.DataFrame, source: str) -> list[dict]:
    """Convert a DataFrame into a list of lead dicts ready for Supabase."""
    df = _normalize_columns(df)
    df = df.dropna(how="all")
    df = df.fillna("")

    known_cols = set(COLUMN_MAP.values())
    leads = []

    for _, row in df.iterrows():
        row_dict = row.to_dict()

        lead: dict[str, Any] = {"source": source, "raw_data": {}}

        # Map known fields
        for col in known_cols:
            if col in row_dict and row_dict[col] != "":
                lead[col] = str(row_dict[col]).strip()

        # Store unknown columns in raw_data
        for col, val in row_dict.items():
            if col not in known_cols and val != "":
                lead["raw_data"][col] = str(val).strip()

        # Skip completely empty rows
        if not any(v for k, v in lead.items() if k not in ("source", "raw_data")):
            continue

        # Normalise email
        if lead.get("email"):
            lead["email"] = lead["email"].strip().lower()
            if not _is_valid_email(lead["email"]):
                lead["email"] = ""  # keep the row but don't use invalid email as key

        # Detect lead type
        lead["lead_type"] = _detect_lead_type(lead)

        leads.append(lead)

    return leads


def ingest_file(
    file_path: str | None = None,
    file_bytes: bytes | None = None,
    filename: str = "upload.csv",
    source: str = "csv_upload",
    auto_push_campaign_id: str | None = None,
) -> dict:
    """
    Main ingestion entry point.
    Accepts either a file path (folder watcher) or raw bytes (UI upload).

    Returns:
        { inserted, updated, skipped, pushed_to_instantly, errors }
    """
    errors: list[str] = []

    # --- Load file into DataFrame ---
    try:
        ext = Path(filename).suffix.lower()
        if file_bytes is not None:
            buf = io.BytesIO(file_bytes)
            if ext in (".xlsx", ".xls"):
                sheets = pd.read_excel(buf, sheet_name=None, engine="openpyxl")
                dfs = list(sheets.values())
            else:
                buf.seek(0)
                dfs = [pd.read_csv(buf)]
        elif file_path:
            if ext in (".xlsx", ".xls"):
                sheets = pd.read_excel(file_path, sheet_name=None, engine="openpyxl")
                dfs = list(sheets.values())
            else:
                dfs = [pd.read_csv(file_path)]
        else:
            return {"inserted": 0, "updated": 0, "skipped": 0,
                    "pushed_to_instantly": 0, "errors": ["No file provided."]}
    except Exception as e:
        return {"inserted": 0, "updated": 0, "skipped": 0,
                "pushed_to_instantly": 0, "errors": [f"Failed to read file: {e}"]}

    # --- Parse all sheets/frames ---
    all_leads: list[dict] = []
    for df in dfs:
        all_leads.extend(_parse_dataframe(df, source))

    if not all_leads:
        return {"inserted": 0, "updated": 0, "skipped": 0,
                "pushed_to_instantly": 0, "errors": ["No lead rows found in file."]}

    # --- Upsert into Supabase ---
    inserted = 0
    updated = 0
    skipped = 0
    newly_inserted_ids: list[str] = []

    db = get_client()

    for lead in all_leads:
        try:
            email = lead.get("email", "")

            # Check if lead already exists (by email)
            exists = False
            if email:
                res = db.table("leads").select("id").ilike("email", email).execute()
                exists = bool(res.data)

            result = upsert_lead(lead)
            lead_id = result.get("id")

            if lead_id:
                if exists:
                    updated += 1
                else:
                    inserted += 1
                    newly_inserted_ids.append(lead_id)
            else:
                skipped += 1

        except Exception as e:
            errors.append(f"Row error ({lead.get('email', 'no-email')}): {e}")
            skipped += 1

    # --- Auto-push new leads to Instantly ---
    pushed = 0
    if auto_push_campaign_id and newly_inserted_ids:
        pushed, push_errors = _push_to_instantly(
            newly_inserted_ids, auto_push_campaign_id
        )
        errors.extend(push_errors)

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "pushed_to_instantly": pushed,
        "total_rows": len(all_leads),
        "errors": errors,
    }


def _push_to_instantly(lead_ids: list[str], campaign_id: str) -> tuple[int, list[str]]:
    """Push a list of lead IDs to an Instantly campaign."""
    db = get_client()
    errors: list[str] = []

    # Fetch full lead data for these IDs
    result = db.table("leads").select("*").in_("id", lead_ids).execute()
    leads = result.data or []

    instantly_leads = []
    for lead in leads:
        email = lead.get("email", "").strip()
        if not _is_valid_email(email):
            continue

        instantly_leads.append({
            "email": email,
            "first_name": lead.get("first_name", ""),
            "last_name": lead.get("last_name", ""),
            "company_name": lead.get("company_name", ""),
            "phone": lead.get("phone", ""),
            "custom_variables": {
                "title": lead.get("title", ""),
                "linkedin": lead.get("linkedin", ""),
                "source": lead.get("source", ""),
                "notes": lead.get("notes", ""),
            },
        })

    if not instantly_leads:
        return 0, []

    pushed = 0
    for i in range(0, len(instantly_leads), 1000):
        batch = instantly_leads[i: i + 1000]
        try:
            result = _api_post("/leads/add", {
                "campaign_id": campaign_id,
                "skip_if_in_workspace": True,
                "leads": batch,
            })
            count = result.get("upload_count", len(batch)) if isinstance(result, dict) else len(batch)
            pushed += count

            # Mark leads as synced in Supabase
            for j, lead in enumerate(leads[i: i + 1000]):
                if _is_valid_email(lead.get("email", "")):
                    mark_lead_synced(lead["id"], campaign_id)

        except Exception as e:
            errors.append(f"Instantly batch {i // 1000 + 1}: {e}")

    return pushed, errors


def get_campaigns_for_selection() -> list[dict]:
    """Return active/paused Instantly campaigns for the UI dropdown."""
    campaigns = fetch_campaigns()
    return [c for c in campaigns if "error" not in c and c.get("status") in (1, 2)]
