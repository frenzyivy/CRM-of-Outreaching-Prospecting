"""
CSV-to-DB Comparison Tool
Reads a CSV file, fetches all leads from Supabase, matches using cascading
dedup (email -> company_website -> linkedin -> phone -> name+company),
and produces a detailed diff report.

Usage:
    python -m tools.csv_db_comparison "path/to/file.csv"
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import pandas as pd

# Reuse existing normalisation and parsing logic
from tools.lead_ingestion import (
    COLUMN_MAP,
    _normalize_columns,
    _parse_dataframe,
    _normalise_website,
    _is_valid_email,
)
from tools.supabase_client import (
    get_client,
    _normalize_company_name,
    _normalize_linkedin,
    _normalize_phone,
    _build_name_key,
)

# Fields that should never be compared / updated
_SKIP_FIELDS = {"id", "created_at", "lead_stages", "stage", "stage_label",
                "lead_score", "email_opens", "email_replies", "email_clicks",
                "email_bounced", "last_email_event", "last_email_event_at",
                "instantly_synced", "instantly_campaign_id", "activities"}


# ---------------------------------------------------------------------------
# 1. Fetch all DB leads with proper pagination
# ---------------------------------------------------------------------------

def fetch_all_db_leads() -> list[dict]:
    """Paginated fetch of ALL leads from Supabase."""
    db = get_client()
    PAGE_SIZE = 1000
    all_leads: list[dict] = []
    offset = 0

    while True:
        result = (
            db.table("leads")
            .select("*")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        all_leads.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return all_leads


# ---------------------------------------------------------------------------
# 2. Build in-memory lookup indexes for fast matching
# ---------------------------------------------------------------------------

def build_db_lookup_indexes(db_leads: list[dict]) -> dict:
    """Pre-build dict indexes for O(1) lookups on various match keys."""
    email_idx: dict[str, dict] = {}
    company_website_idx: dict[str, dict] = {}
    linkedin_idx: dict[str, dict] = {}
    phone_idx: dict[str, dict] = {}
    name_company_list: list[tuple[str, str, dict]] = []

    for lead in db_leads:
        # Email index
        email = (lead.get("email") or "").strip().lower()
        if email:
            email_idx[email] = lead

        # Company website index
        cw = (lead.get("company_website") or "").strip()
        if cw:
            norm_cw = _normalise_website(cw)
            if norm_cw:
                company_website_idx[norm_cw] = lead

        # Website index (also check plain website field)
        ws = (lead.get("website") or "").strip()
        if ws:
            norm_ws = _normalise_website(ws)
            if norm_ws and norm_ws not in company_website_idx:
                company_website_idx[norm_ws] = lead

        # LinkedIn index
        li = (lead.get("linkedin") or "").strip()
        if li:
            norm_li = _normalize_linkedin(li)
            if norm_li and "linkedin.com" in norm_li:
                linkedin_idx[norm_li] = lead

        # Phone index
        ph = (lead.get("phone") or "").strip()
        if ph:
            norm_ph = _normalize_phone(ph)
            if len(norm_ph) >= 7:
                phone_idx[norm_ph] = lead

        # Name + company list (for fuzzy matching)
        name = _build_name_key(
            lead.get("first_name", ""),
            lead.get("last_name", ""),
            lead.get("full_name", ""),
        )
        company = _normalize_company_name(lead.get("company_name", ""))
        if name and company:
            name_company_list.append((name, company, lead))

    return {
        "email": email_idx,
        "company_website": company_website_idx,
        "linkedin": linkedin_idx,
        "phone": phone_idx,
        "name_company": name_company_list,
    }


# ---------------------------------------------------------------------------
# 3. Cascading match: CSV row -> DB lead
# ---------------------------------------------------------------------------

def match_csv_row_to_db(
    csv_lead: dict,
    indexes: dict,
) -> tuple[dict | None, str]:
    """
    Try to match a CSV lead to an existing DB lead using cascading keys.
    Returns (matched_db_lead_or_None, match_type).
    """
    # Pass 1: Email
    email = (csv_lead.get("email") or "").strip().lower()
    if email and email in indexes["email"]:
        return indexes["email"][email], "email"

    # Pass 2: Company website
    cw = (csv_lead.get("company_website") or "").strip()
    if cw:
        norm_cw = _normalise_website(cw)
        if norm_cw and norm_cw in indexes["company_website"]:
            return indexes["company_website"][norm_cw], "company_website"

    # Pass 3: LinkedIn
    li = (csv_lead.get("linkedin") or "").strip()
    if li:
        norm_li = _normalize_linkedin(li)
        if norm_li and "linkedin.com" in norm_li and norm_li in indexes["linkedin"]:
            return indexes["linkedin"][norm_li], "linkedin"

    # Pass 4: Phone
    ph = (csv_lead.get("phone") or "").strip()
    if ph:
        norm_ph = _normalize_phone(ph)
        if len(norm_ph) >= 7 and norm_ph in indexes["phone"]:
            return indexes["phone"][norm_ph], "phone"

    # Pass 5: Fuzzy name + company (85% threshold)
    name = _build_name_key(
        csv_lead.get("first_name", ""),
        csv_lead.get("last_name", ""),
        csv_lead.get("full_name", ""),
    )
    company = _normalize_company_name(csv_lead.get("company_name", ""))
    if name and company:
        for db_name, db_company, db_lead in indexes["name_company"]:
            if (SequenceMatcher(None, name, db_name).ratio() >= 0.85
                    and SequenceMatcher(None, company, db_company).ratio() >= 0.85):
                return db_lead, "name_company"

    return None, "none"


# ---------------------------------------------------------------------------
# 4. Field-by-field diff
# ---------------------------------------------------------------------------

_COMPARE_FIELDS = {
    "email", "first_name", "last_name", "full_name", "title", "phone",
    "linkedin", "company_name", "company_website", "company_linkedin",
    "company_instagram", "company_facebook", "company_twitter",
    "instagram", "facebook", "twitter",
    "company_size", "website", "city", "state",
    "country", "street_address", "postal_code", "industry",
    "email_status", "specialty", "sub_specialties", "star_rating",
    "number_of_reviews", "lead_quality_remarks", "premium_badge",
    "detail_page_url", "experience", "skills", "lead_tier", "notes",
}


def compute_field_diff(csv_lead: dict, db_lead: dict) -> list[dict]:
    """Compare CSV lead fields against DB lead, return list of diffs."""
    diffs: list[dict] = []
    for field in _COMPARE_FIELDS:
        csv_val = str(csv_lead.get(field, "") or "").strip()
        db_val = str(db_lead.get(field, "") or "").strip()

        if not csv_val:
            continue  # empty CSV cell -> no action

        if not db_val:
            action = "fill_empty"
        elif csv_val.lower() == db_val.lower():
            action = "no_change"
        else:
            action = "overwrite"

        diffs.append({
            "field": field,
            "csv_value": csv_val,
            "db_value": db_val,
            "action": action,
        })
    return diffs


# ---------------------------------------------------------------------------
# 5. Deduplicate within the CSV itself
# ---------------------------------------------------------------------------

def _dedup_within_csv(leads: list[dict]) -> tuple[list[dict], int]:
    """Remove duplicates within the CSV. Returns (unique_leads, dup_count)."""
    seen_keys: set[str] = set()
    unique: list[dict] = []
    dups = 0

    for lead in leads:
        dedup_key = ""
        email = (lead.get("email") or "").strip().lower()
        cw = (lead.get("company_website") or "").strip()
        li = (lead.get("linkedin") or "").strip()
        ph = (lead.get("phone") or "").strip()

        if email:
            dedup_key = f"email:{email}"
        elif cw:
            dedup_key = f"cw:{_normalise_website(cw)}"
        elif li:
            norm_li = _normalize_linkedin(li)
            if norm_li and "linkedin.com" in norm_li:
                dedup_key = f"li:{norm_li}"
        elif ph:
            norm_ph = _normalize_phone(ph)
            if len(norm_ph) >= 7:
                dedup_key = f"ph:{norm_ph}"
        else:
            name = _build_name_key(
                lead.get("first_name", ""),
                lead.get("last_name", ""),
                lead.get("full_name", ""),
            )
            company = _normalize_company_name(lead.get("company_name", ""))
            if name and company:
                dedup_key = f"nc:{name}|{company}"

        if dedup_key:
            if dedup_key in seen_keys:
                dups += 1
                continue
            seen_keys.add(dedup_key)

        unique.append(lead)

    return unique, dups


# ---------------------------------------------------------------------------
# 6. Report generation
# ---------------------------------------------------------------------------

def generate_report(
    matches: list[dict],
    new_leads: list[dict],
    skipped: list[dict],
    csv_path: str,
    total_csv_rows: int,
    dups_in_csv: int,
    db_lead_count: int,
) -> str:
    """Produce a human-readable comparison report."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines: list[str] = []

    lines.append("=" * 72)
    lines.append("CSV-DB COMPARISON REPORT")
    lines.append(f"Generated: {now}")
    lines.append(f"CSV File: {csv_path}")
    lines.append("=" * 72)
    lines.append("")

    # Count match types
    match_type_counts: dict[str, int] = {}
    total_overwrites = 0
    total_fills = 0
    total_no_change = 0
    for m in matches:
        mt = m["match_type"]
        match_type_counts[mt] = match_type_counts.get(mt, 0) + 1
        for d in m["diffs"]:
            if d["action"] == "overwrite":
                total_overwrites += 1
            elif d["action"] == "fill_empty":
                total_fills += 1
            elif d["action"] == "no_change":
                total_no_change += 1

    # Matches that actually have changes
    matches_with_changes = [m for m in matches if any(
        d["action"] in ("overwrite", "fill_empty") for d in m["diffs"]
    )]

    lines.append("SUMMARY")
    lines.append("-" * 40)
    lines.append(f"  Total CSV rows:              {total_csv_rows}")
    lines.append(f"  Duplicates within CSV:       {dups_in_csv}")
    lines.append(f"  After dedup (unique):        {total_csv_rows - dups_in_csv}")
    lines.append(f"  DB leads fetched:            {db_lead_count}")
    lines.append(f"  Matched to existing DB:      {len(matches)}")
    for mt, cnt in sorted(match_type_counts.items()):
        lines.append(f"    - by {mt:20s}   {cnt}")
    lines.append(f"  Matches with changes:        {len(matches_with_changes)}")
    lines.append(f"  New leads (to insert):       {len(new_leads)}")
    lines.append(f"  Skipped (no key data):       {len(skipped)}")
    lines.append("")
    lines.append(f"  Fields to overwrite:         {total_overwrites}")
    lines.append(f"  Fields to fill (empty->val): {total_fills}")
    lines.append(f"  Fields unchanged:            {total_no_change}")
    lines.append("")

    # Warn about multiple CSV rows matching same DB lead
    db_ids_seen: dict[str, int] = {}
    for m in matches:
        db_id = m["db_lead"]["id"]
        db_ids_seen[db_id] = db_ids_seen.get(db_id, 0) + 1
    multi_match = {k: v for k, v in db_ids_seen.items() if v > 1}
    if multi_match:
        lines.append("WARNING: Multiple CSV rows matched the same DB lead:")
        for db_id, count in multi_match.items():
            lines.append(f"  DB ID {db_id[:12]}... matched by {count} CSV rows")
        lines.append("")

    # Detail: matches with changes (first 50)
    lines.append("MATCHED LEADS WITH CHANGES (first 50)")
    lines.append("-" * 40)
    for i, m in enumerate(matches_with_changes[:50], 1):
        csv_l = m["csv_lead"]
        db_l = m["db_lead"]
        label = csv_l.get("email") or csv_l.get("full_name") or csv_l.get("company_name") or "?"
        lines.append(f"[{i}] {label} (matched by: {m['match_type']})")
        lines.append(f"    DB ID: {db_l.get('id', '?')[:20]}...")
        changes = [d for d in m["diffs"] if d["action"] in ("overwrite", "fill_empty")]
        for d in changes:
            db_show = d["db_value"][:40] if d["db_value"] else "(empty)"
            csv_show = d["csv_value"][:40]
            lines.append(f"    {d['field']:25s} | {db_show:42s} -> {csv_show:42s} [{d['action']}]")
        lines.append("")

    if len(matches_with_changes) > 50:
        lines.append(f"... and {len(matches_with_changes) - 50} more matches with changes")
        lines.append("")

    # Detail: new leads (first 30)
    lines.append("NEW LEADS TO INSERT (first 30)")
    lines.append("-" * 40)
    for i, lead in enumerate(new_leads[:30], 1):
        label = lead.get("email") or lead.get("full_name") or lead.get("company_name") or "?"
        city = lead.get("city", "")
        country = lead.get("country", "")
        loc = f"{city}, {country}" if city else country
        lines.append(f"  [{i}] {label} | {lead.get('company_name', '')} | {loc}")
    if len(new_leads) > 30:
        lines.append(f"  ... and {len(new_leads) - 30} more new leads")
    lines.append("")

    return "\n".join(lines)


def save_report(report_text: str, structured_data: dict, base_dir: str) -> tuple[str, str]:
    """Save report as .txt and .json to .tmp/ directory."""
    tmp_dir = os.path.join(base_dir, ".tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    txt_path = os.path.join(tmp_dir, f"csv_db_comparison_{ts}.txt")
    json_path = os.path.join(tmp_dir, f"csv_db_comparison_{ts}.json")

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(report_text)

    # Make JSON-serializable (strip large nested dicts)
    json_safe = {
        "timestamp": ts,
        "summary": structured_data.get("summary", {}),
        "match_count": len(structured_data.get("matches", [])),
        "new_count": len(structured_data.get("new_leads", [])),
        "skipped_count": len(structured_data.get("skipped", [])),
        # Store minimal match info for the updater
        "matches": [
            {
                "db_id": m["db_lead"]["id"],
                "match_type": m["match_type"],
                "csv_email": m["csv_lead"].get("email", ""),
                "changes": len([d for d in m["diffs"] if d["action"] in ("overwrite", "fill_empty")]),
            }
            for m in structured_data.get("matches", [])
        ],
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_safe, f, indent=2, default=str)

    return txt_path, json_path


# ---------------------------------------------------------------------------
# 7. Main orchestrator
# ---------------------------------------------------------------------------

def main(csv_path: str, source: str = "csv_update") -> dict:
    """
    Run the full CSV-to-DB comparison. Returns structured results.
    """
    base_dir = str(Path(__file__).resolve().parent.parent)

    # 1. Read CSV
    print(f"Reading CSV: {csv_path}")
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    total_csv_rows = len(df)
    print(f"  Total CSV rows: {total_csv_rows}")

    # 2. Parse through existing normalization pipeline
    print("Normalizing columns and parsing rows...")
    leads, skipped = _parse_dataframe(df, source)
    print(f"  Parsed: {len(leads)} leads, {len(skipped)} skipped")

    # 3. Dedup within CSV
    unique_leads, dups_in_csv = _dedup_within_csv(leads)
    print(f"  After CSV dedup: {len(unique_leads)} unique, {dups_in_csv} duplicates removed")

    # 4. Fetch all DB leads
    print("Fetching all leads from Supabase...")
    db_leads = fetch_all_db_leads()
    print(f"  DB leads fetched: {len(db_leads)}")

    # 5. Build indexes
    print("Building lookup indexes...")
    indexes = build_db_lookup_indexes(db_leads)
    print(f"  Email index: {len(indexes['email'])} entries")
    print(f"  Company website index: {len(indexes['company_website'])} entries")
    print(f"  LinkedIn index: {len(indexes['linkedin'])} entries")
    print(f"  Phone index: {len(indexes['phone'])} entries")
    print(f"  Name+company pairs: {len(indexes['name_company'])} entries")

    # 6. Match each CSV lead
    print("Matching CSV leads against DB...")
    matches: list[dict] = []
    new_leads: list[dict] = []

    for i, csv_lead in enumerate(unique_leads):
        db_match, match_type = match_csv_row_to_db(csv_lead, indexes)
        if db_match:
            diffs = compute_field_diff(csv_lead, db_match)
            matches.append({
                "csv_lead": csv_lead,
                "db_lead": db_match,
                "match_type": match_type,
                "diffs": diffs,
            })
        else:
            new_leads.append(csv_lead)

        if (i + 1) % 500 == 0:
            print(f"  Processed {i + 1}/{len(unique_leads)}...")

    print(f"\n  Matched: {len(matches)}")
    print(f"  New:     {len(new_leads)}")
    print(f"  Skipped: {len(skipped)}")

    # 7. Generate report
    print("\nGenerating report...")
    summary = {
        "total_csv_rows": total_csv_rows,
        "dups_in_csv": dups_in_csv,
        "unique_csv_leads": len(unique_leads),
        "db_leads": len(db_leads),
        "matched": len(matches),
        "new": len(new_leads),
        "skipped": len(skipped),
    }

    report_text = generate_report(
        matches=matches,
        new_leads=new_leads,
        skipped=skipped,
        csv_path=csv_path,
        total_csv_rows=total_csv_rows,
        dups_in_csv=dups_in_csv,
        db_lead_count=len(db_leads),
    )

    structured = {
        "summary": summary,
        "matches": matches,
        "new_leads": new_leads,
        "skipped": skipped,
    }

    txt_path, json_path = save_report(report_text, structured, base_dir)
    print(f"\nReport saved to:")
    print(f"  TXT: {txt_path}")
    print(f"  JSON: {json_path}")

    # Print summary to console
    print("\n" + "=" * 50)
    print(report_text[:2000])  # first ~2000 chars of report
    if len(report_text) > 2000:
        print(f"\n... (full report in {txt_path})")

    return structured


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Compare CSV leads against Supabase DB (dry-run)"
    )
    parser.add_argument("csv_path", help="Path to CSV file")
    parser.add_argument("--source", default="csv_update", help="Source label")
    args = parser.parse_args()

    if not os.path.isfile(args.csv_path):
        print(f"Error: File not found: {args.csv_path}")
        sys.exit(1)

    main(args.csv_path, source=args.source)
