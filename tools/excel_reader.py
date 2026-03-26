"""
Excel Reader Tool
Reads and caches lead data from the master Excel file.
Handles Windows file locking gracefully.
"""

import hashlib
import os
import time
from typing import Any

import pandas as pd

# Module-level cache
_cache: dict[str, Any] = {
    "companies": [],
    "contacts": [],
    "leads": [],
    "last_mtime": 0.0,
    "last_read": 0.0,
    "error": None,
}

POLL_INTERVAL = 30  # seconds


def _generate_id(lead_type: str, row: dict) -> str:
    """Generate a stable hash ID for a lead row."""
    if lead_type == "company":
        key = row.get("company_name", "")
    elif lead_type == "lead":
        key = row.get("email", "") or row.get("full_name", "") or f"{row.get('first_name', '')}-{row.get('last_name', '')}"
    else:
        key = row.get("email", "") or f"{row.get('first_name', '')}-{row.get('last_name', '')}"
    raw = f"{lead_type}:{key}".lower().strip()
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case."""
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(r"[^\w\s]", "", regex=True)
        .str.replace(r"\s+", "_", regex=True)
    )
    return df


def _read_sheet(file_path: str, sheet_name: str) -> list[dict]:
    """Read a single sheet and return as list of dicts."""
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, engine="openpyxl")
        df = _normalize_columns(df)
        df = df.dropna(how="all")  # drop fully empty rows
        df = df.fillna("")  # replace NaN with empty string
        return df.to_dict(orient="records")
    except ValueError:
        # Sheet doesn't exist
        return []


def read_leads(file_path: str, force: bool = False) -> dict[str, Any]:
    """
    Read leads from the master Excel file.
    Uses caching — only re-reads if file has been modified.

    Returns:
        {
            "companies": [...],
            "contacts": [...],
            "last_modified": float,
            "error": str | None
        }
    """
    global _cache

    if not os.path.exists(file_path):
        _cache["error"] = f"Excel file not found: {file_path}"
        return _cache

    try:
        mtime = os.path.getmtime(file_path)
    except OSError:
        _cache["error"] = "Cannot access Excel file"
        return _cache

    # Return cached data if file hasn't changed and not forcing
    now = time.time()
    if not force and mtime == _cache["last_mtime"] and (now - _cache["last_read"]) < POLL_INTERVAL:
        return _cache

    # Try to read the file
    try:
        companies_raw = _read_sheet(file_path, "Companies")
        contacts_raw = _read_sheet(file_path, "Contacts")
        leads_raw = _read_sheet(file_path, "Leads")

        # Add IDs
        for row in companies_raw:
            row["id"] = _generate_id("company", row)
            row["lead_type"] = "company"

        for row in contacts_raw:
            row["id"] = _generate_id("contact", row)
            row["lead_type"] = "contact"

        for row in leads_raw:
            row["id"] = _generate_id("lead", row)
            row["lead_type"] = "lead"

        _cache["companies"] = companies_raw
        _cache["contacts"] = contacts_raw
        _cache["leads"] = leads_raw
        _cache["last_mtime"] = mtime
        _cache["last_read"] = now
        _cache["error"] = None

    except PermissionError:
        # File is locked (open in Excel on Windows) — serve cached data
        _cache["error"] = "Excel file is currently open in another program. Showing cached data."

    except Exception as e:
        _cache["error"] = f"Error reading Excel file: {str(e)}"

    return _cache


def get_companies(file_path: str) -> list[dict]:
    """Get company leads."""
    data = read_leads(file_path)
    return data["companies"]


def get_contacts(file_path: str) -> list[dict]:
    """Get contact leads."""
    data = read_leads(file_path)
    return data["contacts"]


def get_all_leads(file_path: str) -> list[dict]:
    """Get all leads (companies + contacts)."""
    data = read_leads(file_path)
    return data["companies"] + data["contacts"]


def get_lead_records(file_path: str) -> list[dict]:
    """Get lead records from the Leads sheet."""
    data = read_leads(file_path)
    return data.get("leads", [])
