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

from difflib import SequenceMatcher

from tools.supabase_client import (
    mark_lead_synced, get_client,
    _normalize_company_name, _normalize_linkedin, _normalize_phone, _build_name_key,
)
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
    # instagram (person-level)
    "instagram": "instagram",
    "instagram_url": "instagram",
    "instagram_profile": "instagram",
    "ig_handle": "instagram",
    "ig_url": "instagram",
    # facebook (person-level)
    "facebook": "facebook",
    "facebook_url": "facebook",
    "facebook_profile": "facebook",
    "fb_url": "facebook",
    "fb_profile": "facebook",
    # twitter / X (person-level)
    "twitter": "twitter",
    "twitter_url": "twitter",
    "twitter_handle": "twitter",
    "twitter_profile": "twitter",
    "x_url": "twitter",
    "x_handle": "twitter",
    "x_profile": "twitter",
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
    # professional email alias
    "professional_email": "email",
    # email status (valid/risky/invalid)
    "email_status": "email_status",
    "email_validity": "email_status",
    # company data available
    "company_data_available": "company_data_available",
    # company website alias
    "company_website": "company_website",
    # email type
    "email_type": "email_type",
    # specialty
    "specialty": "specialty",
    "speciality": "specialty",
    # sub-specialties
    "sub_specialties": "sub_specialties",
    "sub_specialty": "sub_specialties",
    "subspecialties": "sub_specialties",
    # street address
    "street_address": "street_address",
    "address": "street_address",
    "street": "street_address",
    # postal code
    "postal_code": "postal_code",
    "zip_code": "postal_code",
    "zip": "postal_code",
    "postcode": "postal_code",
    # star rating
    "star_rating": "star_rating",
    "rating": "star_rating",
    "stars": "star_rating",
    # number of reviews
    "number_of_reviews": "number_of_reviews",
    "reviews": "number_of_reviews",
    "review_count": "number_of_reviews",
    # company linkedin
    "company_linkedin": "company_linkedin",
    "company_linkedin_url": "company_linkedin",
    # company instagram
    "company_instagram": "company_instagram",
    # company facebook
    "company_facebook": "company_facebook",
    "company_facebook_url": "company_facebook",
    # company twitter / X
    "company_twitter": "company_twitter",
    "company_twitter_url": "company_twitter",
    "company_x": "company_twitter",
    # company size
    "company_size": "company_size",
    "employees": "company_size",
    "employee_count": "company_size",
    # lead quality remarks
    "lead_quality_remarks": "lead_quality_remarks",
    "quality_remarks": "lead_quality_remarks",
    "remarks": "lead_quality_remarks",
    # premium badge
    "premium_badge": "premium_badge",
    "premium": "premium_badge",
    # detail page url
    "detail_page_url": "detail_page_url",
    "detail_url": "detail_page_url",
    "profile_url": "detail_page_url",
    # experience
    "experience": "experience",
    "years_of_experience": "experience",
    # skills
    "skills": "skills",
    # lead tier (hot/warm/cold)
    "lead_tier": "lead_tier",
    "lead_quality": "lead_tier",
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



def _parse_dataframe(df: pd.DataFrame, source: str) -> tuple[list[dict], list[dict]]:
    """Convert a DataFrame into a list of lead dicts ready for Supabase.
    Returns (leads, skipped_rows)."""
    df = _normalize_columns(df)
    df = df.dropna(how="all")
    df = df.fillna("")

    # Columns that actually exist in the Supabase 'leads' table
    TABLE_COLS = {
        "city", "company_name", "country", "email",
        "first_name", "full_name", "industry", "last_name",
        "linkedin", "notes", "phone", "raw_data", "source", "state",
        "title", "website",
        # Extended schema
        "email_status", "email_type", "specialty", "sub_specialties",
        "street_address", "postal_code", "star_rating", "number_of_reviews",
        "company_website", "company_linkedin", "company_instagram",
        "company_facebook", "company_twitter",
        "instagram", "facebook", "twitter",
        "company_size", "lead_quality_remarks", "premium_badge",
        "detail_page_url", "experience", "skills", "lead_tier",
        "lead_type",
    }

    _TIER_VALUES = {"hot", "warm", "cold"}
    known_cols = set(COLUMN_MAP.values())
    leads = []
    skipped_rows: list[dict] = []

    for _, row in df.iterrows():
        row_dict = row.to_dict()

        lead: dict[str, Any] = {"source": source, "raw_data": {}}

        # Map known fields — only put actual table columns as top-level keys,
        # everything else goes into raw_data
        for col in known_cols:
            if col in row_dict and row_dict[col] != "":
                val = str(row_dict[col]).strip()
                if col in TABLE_COLS:
                    lead[col] = val
                else:
                    lead["raw_data"][col] = val

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

        # Normalise country name variants
        if lead.get("country"):
            lead["country"] = _normalise_country(lead["country"])

        # Rescue CSV "Lead Type" column (Hot/Warm/Cold) → lead_tier
        csv_lead_type = str(lead.get("lead_type", "")).strip().lower()
        if csv_lead_type in _TIER_VALUES:
            lead["lead_tier"] = csv_lead_type

        # Set lead_type discriminator ("contact" or "company") for DB NOT-NULL column
        has_person_data = bool(
            lead.get("first_name") or lead.get("last_name") or lead.get("full_name") or lead.get("email")
        )
        lead["lead_type"] = "contact" if has_person_data else "company"

        # COMPULSORY: every row must have either person data or company data
        has_email = bool(lead.get("email"))
        has_website = bool(lead.get("website", "").strip())
        has_person = bool(lead.get("first_name") or lead.get("full_name"))
        has_company = bool(lead.get("company_name"))
        if not has_email and not has_website and not has_person and not has_company:
            skipped_rows.append(lead)
            continue

        leads.append(lead)

    return leads, skipped_rows


_COUNTRY_ALIASES: dict[str, str] = {
    "usa": "United States", "us": "United States", "u.s.": "United States",
    "u.s.a.": "United States", "united states of america": "United States",
    "uk": "United Kingdom", "u.k.": "United Kingdom",
    "great britain": "United Kingdom", "england": "United Kingdom",
    "uae": "United Arab Emirates", "u.a.e.": "United Arab Emirates",
    "ksa": "Saudi Arabia",
}


def _normalise_country(country: str) -> str:
    """Normalise common country name variants."""
    if not country:
        return country
    lower = country.strip().lower()
    return _COUNTRY_ALIASES.get(lower, country.strip())


def _normalise_website(url: str) -> str:
    """Strip protocol and trailing slash for consistent website matching."""
    url = url.strip().lower()
    for prefix in ("https://", "http://", "www."):
        if url.startswith(prefix):
            url = url[len(prefix):]
    return url.rstrip("/")


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

    Deduplication logic:
    - Contacts/Leads: matched by **email**
    - Companies (no email): matched by **website**

    Returns:
        { inserted, updated, duplicates_in_file, total_rows,
          company_linked, pushed_to_instantly, errors }
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
            return {"inserted": 0, "updated": 0, "duplicates_in_file": 0,
                    "total_rows": 0, "errors": ["No file provided."]}
    except Exception as e:
        return {"inserted": 0, "updated": 0, "duplicates_in_file": 0,
                "total_rows": 0, "errors": [f"Failed to read file: {e}"]}

    # --- Parse all sheets/frames ---
    all_leads: list[dict] = []
    all_skipped_rows: list[dict] = []
    for df in dfs:
        leads, skipped = _parse_dataframe(df, source)
        all_leads.extend(leads)
        all_skipped_rows.extend(skipped)

    skipped_no_key = len(all_skipped_rows)

    # Flatten skipped rows for CSV download (merge raw_data into top-level)
    skipped_flat: list[dict] = []
    for row in all_skipped_rows:
        flat: dict[str, str] = {}
        for k, v in row.items():
            if k in ("source", "raw_data"):
                continue
            if v:
                flat[k] = str(v)
        for k, v in (row.get("raw_data") or {}).items():
            if v:
                flat[k] = str(v)
        if flat:
            skipped_flat.append(flat)

    if not all_leads and skipped_no_key > 0:
        return {"inserted": 0, "updated": 0, "duplicates_in_file": 0,
                "skipped_no_key": skipped_no_key, "skipped_rows": skipped_flat,
                "total_rows": skipped_no_key,
                "errors": [f"{skipped_no_key} row(s) skipped — every row must have an email or website."]}

    if not all_leads:
        return {"inserted": 0, "updated": 0, "duplicates_in_file": 0,
                "skipped_no_key": 0, "skipped_rows": [],
                "total_rows": 0, "errors": ["No lead rows found in file."]}

    # --- Step 1: Deduplicate within the uploaded file itself ---
    # Cascading key: email → website (companies) → LinkedIn → phone → name+company
    seen_keys: set[str] = set()
    unique_leads: list[dict] = []
    duplicates_in_file = 0

    for lead in all_leads:
        dedup_key = ""
        email = lead.get("email", "").strip().lower()
        website = lead.get("website", "").strip()
        linkedin = (lead.get("linkedin") or "").strip()
        phone = (lead.get("phone") or "").strip()

        if email:
            dedup_key = f"email:{email}"
        elif website:
            dedup_key = f"website:{_normalise_website(website)}"
        elif linkedin:
            norm_li = _normalize_linkedin(linkedin)
            if norm_li and "linkedin.com" in norm_li:
                dedup_key = f"linkedin:{norm_li}"
        elif phone:
            norm_phone = _normalize_phone(phone)
            if len(norm_phone) >= 7:
                dedup_key = f"phone:{norm_phone}"
        else:
            # Last resort: name + company (exact normalized match within file)
            name = _build_name_key(
                lead.get("first_name", ""),
                lead.get("last_name", ""),
                lead.get("full_name", ""),
            )
            company = _normalize_company_name(lead.get("company_name", ""))
            if name and company:
                dedup_key = f"namecompany:{name}|{company}"

        if dedup_key:
            if dedup_key in seen_keys:
                duplicates_in_file += 1
                continue
            seen_keys.add(dedup_key)

        unique_leads.append(lead)

    # --- Step 2: Upsert into Supabase ---
    inserted = 0
    updated = 0
    newly_inserted_ids: list[str] = []

    db = get_client()

    for lead in unique_leads:
        try:
            email = lead.get("email", "").strip().lower()
            website = lead.get("website", "").strip()

            # --- Check if record already exists in DB (cascading match) ---
            existing_row = None
            linkedin = (lead.get("linkedin") or "").strip()
            phone = (lead.get("phone") or "").strip()

            if email:
                res = db.table("leads").select("*").ilike("email", email).limit(1).execute()
                if res.data:
                    existing_row = res.data[0]

            if not existing_row and website:
                norm = _normalise_website(website)
                domain_part = norm.split("/")[0]
                res = db.table("leads").select("*").ilike("website", f"%{domain_part}%").execute()
                for row in (res.data or []):
                    row_website = (row.get("website") or "").strip()
                    if row_website and _normalise_website(row_website) == norm:
                        existing_row = row
                        break

            if not existing_row and linkedin:
                norm_li = _normalize_linkedin(linkedin)
                if norm_li and "linkedin.com" in norm_li:
                    res = db.table("leads").select("*").ilike("linkedin", f"%{norm_li}%").limit(1).execute()
                    if res.data:
                        existing_row = res.data[0]

            if not existing_row and phone:
                norm_phone = _normalize_phone(phone)
                if len(norm_phone) >= 7:
                    res = db.table("leads").select("*").ilike("phone", f"%{norm_phone[-7:]}%").execute()
                    for row in (res.data or []):
                        if _normalize_phone(row.get("phone") or "") == norm_phone:
                            existing_row = row
                            break

            if not existing_row and not email:
                # Last resort: fuzzy name + company match
                name = _build_name_key(
                    lead.get("first_name", ""),
                    lead.get("last_name", ""),
                    lead.get("full_name", ""),
                )
                company = _normalize_company_name(lead.get("company_name", ""))
                if name and company:
                    res = db.table("leads").select("*").ilike(
                        "company_name", f"%{company[:10]}%"
                    ).execute()
                    for row in (res.data or []):
                        row_name = _build_name_key(
                            row.get("first_name", ""),
                            row.get("last_name", ""),
                            row.get("full_name", ""),
                        )
                        row_company = _normalize_company_name(row.get("company_name", ""))
                        if (row_name and row_company
                                and SequenceMatcher(None, name, row_name).ratio() >= 0.85
                                and SequenceMatcher(None, company, row_company).ratio() >= 0.85):
                            existing_row = row
                            break

            if existing_row:
                # --- UPDATE: merge only missing/empty fields ---
                update_data: dict[str, Any] = {}
                existing_raw = existing_row.get("raw_data") or {}

                for key, val in lead.items():
                    if key in ("source", "raw_data"):
                        continue
                    existing_val = existing_row.get(key)
                    if not existing_val and val:
                        update_data[key] = val

                # Merge raw_data
                new_raw = lead.get("raw_data", {})
                if new_raw:
                    merged_raw = {**existing_raw}
                    for rk, rv in new_raw.items():
                        if rk not in merged_raw or not merged_raw[rk]:
                            merged_raw[rk] = rv
                    if merged_raw != existing_raw:
                        update_data["raw_data"] = merged_raw

                if update_data:
                    db.table("leads").update(update_data).eq("id", existing_row["id"]).execute()

                updated += 1
            else:
                # --- INSERT new lead ---
                result = db.table("leads").insert(lead).execute()
                lead_id = (result.data[0] if result.data else {}).get("id")
                if lead_id:
                    inserted += 1
                    newly_inserted_ids.append(lead_id)

        except Exception as e:
            errors.append(f"Row error ({lead.get('email') or lead.get('website') or 'no-key'}): {e}")

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
        "duplicates_in_file": duplicates_in_file,
        "skipped_no_key": skipped_no_key,
        "skipped_rows": skipped_flat,
        "pushed_to_instantly": pushed,
        "total_rows": len(all_leads) + duplicates_in_file + skipped_no_key,
        "errors": errors,
    }


def _push_to_instantly(lead_ids: list[str], campaign_id: str) -> tuple[int, list[str]]:
    """Push a list of lead IDs to an Instantly campaign."""
    db = get_client()
    errors: list[str] = []

    # Fetch full lead data for these IDs (batched to avoid URL-too-long)
    leads = []
    for i in range(0, len(lead_ids), 50):
        batch = lead_ids[i:i + 50]
        result = db.table("leads").select("*").in_("id", batch).execute()
        leads.extend(result.data or [])

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
