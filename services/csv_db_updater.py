"""
CSV-to-DB Lead Updater
Matches CSV leads to existing Supabase records and force-overwrites all
non-empty CSV fields. Inserts truly new leads.

Usage:
    python -m tools.csv_db_updater "path/to/file.csv"
    python -m tools.csv_db_updater --dry-run "path/to/file.csv"
    python -m tools.csv_db_updater --source "master_csv_2026" "path/to/file.csv"
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

# Reuse comparison / matching logic
from services.csv_db_comparison import (
    fetch_all_db_leads,
    build_db_lookup_indexes,
    match_csv_row_to_db,
    compute_field_diff,
    _dedup_within_csv,
    generate_report,
    save_report,
)
from services.lead_ingestion import _parse_dataframe
from core.supabase_client import get_client

# Fields that must NEVER be overwritten
_PROTECTED_FIELDS = {
    "id", "created_at", "lead_type",  # discriminator is always recomputed
    "source",  # preserve original source
    "raw_data",  # merged separately
    # Engagement tracking — preserve DB values
    "email_opens", "email_replies", "email_clicks", "email_bounced",
    "last_email_event", "last_email_event_at",
    "instantly_synced", "instantly_campaign_id",
    # Computed / joined fields
    "lead_stages", "stage", "stage_label", "lead_score", "activities",
}


# ---------------------------------------------------------------------------
# Build update / insert payloads
# ---------------------------------------------------------------------------

def build_update_payload(csv_lead: dict, db_lead: dict) -> dict:
    """
    Build the Supabase update payload with FORCE-OVERWRITE semantics.
    All non-empty CSV fields replace DB values. Empty CSV cells are skipped.
    Protected fields are never touched.
    """
    payload: dict[str, Any] = {}

    for key, val in csv_lead.items():
        if key in _PROTECTED_FIELDS:
            continue
        if not val or (isinstance(val, str) and not val.strip()):
            continue  # empty CSV cell -> don't touch DB value

        val_str = str(val).strip()
        db_val = str(db_lead.get(key, "") or "").strip()

        # Only include if value actually differs
        if val_str.lower() != db_val.lower():
            payload[key] = val_str

    # Merge raw_data: CSV values overwrite on conflict, DB values preserved otherwise
    csv_raw = csv_lead.get("raw_data") or {}
    db_raw = db_lead.get("raw_data") or {}
    if csv_raw:
        merged_raw = {**db_raw}
        for rk, rv in csv_raw.items():
            if rv:  # CSV raw value non-empty -> overwrite
                merged_raw[rk] = rv
        if merged_raw != db_raw:
            payload["raw_data"] = merged_raw

    return payload


def build_insert_payload(csv_lead: dict) -> dict:
    """Build the Supabase insert payload for a new lead."""
    payload: dict[str, Any] = {}
    for key, val in csv_lead.items():
        if key in ("lead_stages", "stage", "stage_label", "lead_score", "activities"):
            continue
        if val is not None and val != "":
            payload[key] = val
    return payload


# ---------------------------------------------------------------------------
# Execute updates and inserts
# ---------------------------------------------------------------------------

def execute_updates(
    matches: list[dict],
    dry_run: bool = False,
) -> dict:
    """
    Update matched leads in Supabase.
    Returns { updated, skipped, errors }.
    """
    db = get_client() if not dry_run else None
    updated = 0
    skipped = 0
    errors: list[str] = []

    # Deduplicate: if multiple CSV rows match the same DB lead, keep the LAST one
    seen_db_ids: dict[str, dict] = {}
    for m in matches:
        db_id = m["db_lead"]["id"]
        seen_db_ids[db_id] = m  # last one wins

    deduped_matches = list(seen_db_ids.values())
    multi_match_count = len(matches) - len(deduped_matches)
    if multi_match_count:
        print(f"  Note: {multi_match_count} duplicate DB matches resolved (last CSV row wins)")

    total = len(deduped_matches)
    for i, m in enumerate(deduped_matches):
        csv_lead = m["csv_lead"]
        db_lead = m["db_lead"]

        payload = build_update_payload(csv_lead, db_lead)

        if not payload:
            skipped += 1
            continue

        if dry_run:
            updated += 1
            continue

        try:
            db.table("leads").update(payload).eq("id", db_lead["id"]).execute()
            updated += 1
        except Exception as e:
            label = csv_lead.get("email") or csv_lead.get("full_name") or "?"
            errors.append(f"Update failed ({label}): {e}")

        # Rate limiting: 100ms pause every 50 writes
        if (i + 1) % 50 == 0:
            time.sleep(0.1)
            print(f"    Updated {i + 1}/{total}...")

    return {"updated": updated, "skipped": skipped, "errors": errors}


def execute_inserts(
    new_leads: list[dict],
    source: str,
    dry_run: bool = False,
) -> dict:
    """
    Insert new leads into Supabase.
    Returns { inserted, errors }.
    """
    db = get_client() if not dry_run else None
    inserted = 0
    errors: list[str] = []
    total = len(new_leads)

    for i, csv_lead in enumerate(new_leads):
        payload = build_insert_payload(csv_lead)
        if not payload:
            continue

        # Ensure source is set
        payload.setdefault("source", source)

        if dry_run:
            inserted += 1
            continue

        try:
            db.table("leads").insert(payload).execute()
            inserted += 1
        except Exception as e:
            label = csv_lead.get("email") or csv_lead.get("full_name") or "?"
            errors.append(f"Insert failed ({label}): {e}")

        # Rate limiting
        if (i + 1) % 50 == 0:
            time.sleep(0.1)
            print(f"    Inserted {i + 1}/{total}...")

    return {"inserted": inserted, "errors": errors}


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def main(
    csv_path: str,
    source: str = "csv_update",
    dry_run: bool = False,
    no_confirm: bool = False,
) -> dict:
    """Run the full CSV-to-DB update."""
    base_dir = str(Path(__file__).resolve().parent.parent)

    mode_label = "DRY-RUN" if dry_run else "LIVE UPDATE"
    print(f"\n{'=' * 50}")
    print(f"CSV-DB UPDATER [{mode_label}]")
    print(f"{'=' * 50}\n")

    # 1. Read CSV
    print(f"Reading CSV: {csv_path}")
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    total_csv_rows = len(df)
    print(f"  Total CSV rows: {total_csv_rows}")

    # 2. Parse
    print("Normalizing and parsing...")
    leads, skipped = _parse_dataframe(df, source)
    print(f"  Parsed: {len(leads)} leads, {len(skipped)} skipped")

    # 3. Dedup within CSV
    unique_leads, dups_in_csv = _dedup_within_csv(leads)
    print(f"  After dedup: {len(unique_leads)} unique, {dups_in_csv} duplicates")

    # 4. Fetch DB leads
    print("Fetching all leads from Supabase...")
    db_leads = fetch_all_db_leads()
    print(f"  DB leads: {len(db_leads)}")

    # 5. Build indexes
    print("Building indexes...")
    indexes = build_db_lookup_indexes(db_leads)

    # 6. Match
    print("Matching CSV leads to DB...")
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

    # Count actual changes
    matches_with_changes = [m for m in matches if
        build_update_payload(m["csv_lead"], m["db_lead"])]

    print(f"\n  Matched total:      {len(matches)}")
    print(f"  Matches with changes: {len(matches_with_changes)}")
    print(f"  New leads to insert:  {len(new_leads)}")

    # 7. Confirmation
    if not dry_run and not no_confirm:
        print(f"\nAbout to UPDATE {len(matches_with_changes)} leads and INSERT {len(new_leads)} new leads.")
        answer = input("Continue? [y/N]: ").strip().lower()
        if answer != "y":
            print("Aborted.")
            return {"aborted": True}

    # 8. Execute
    print(f"\n{'--- Executing Updates ---' if not dry_run else '--- Dry-Run: Updates ---'}")
    update_result = execute_updates(matches, dry_run=dry_run)
    print(f"  Updated: {update_result['updated']}, Skipped (no change): {update_result['skipped']}")
    if update_result["errors"]:
        print(f"  Errors: {len(update_result['errors'])}")

    print(f"\n{'--- Executing Inserts ---' if not dry_run else '--- Dry-Run: Inserts ---'}")
    insert_result = execute_inserts(new_leads, source=source, dry_run=dry_run)
    print(f"  Inserted: {insert_result['inserted']}")
    if insert_result["errors"]:
        print(f"  Errors: {len(insert_result['errors'])}")

    # 9. Save results log
    results = {
        "mode": "dry_run" if dry_run else "live",
        "timestamp": datetime.now().isoformat(),
        "csv_path": csv_path,
        "source": source,
        "total_csv_rows": total_csv_rows,
        "dups_in_csv": dups_in_csv,
        "unique_csv_leads": len(unique_leads),
        "db_leads_fetched": len(db_leads),
        "matched_total": len(matches),
        "matched_with_changes": len(matches_with_changes),
        "updated": update_result["updated"],
        "update_skipped": update_result["skipped"],
        "update_errors": update_result["errors"],
        "new_leads_total": len(new_leads),
        "inserted": insert_result["inserted"],
        "insert_errors": insert_result["errors"],
        "skipped_no_key": len(skipped),
    }

    tmp_dir = os.path.join(base_dir, ".tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = os.path.join(tmp_dir, f"csv_db_update_{ts}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\nResults log saved to: {log_path}")

    # Final summary
    print(f"\n{'=' * 50}")
    print(f"DONE [{mode_label}]")
    print(f"  Updated:  {update_result['updated']}")
    print(f"  Inserted: {insert_result['inserted']}")
    print(f"  Errors:   {len(update_result['errors']) + len(insert_result['errors'])}")
    print(f"{'=' * 50}")

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update/insert leads from CSV into Supabase"
    )
    parser.add_argument("csv_path", help="Path to CSV file")
    parser.add_argument("--source", default="csv_update",
                        help="Source label for new leads")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without writing")
    parser.add_argument("--no-confirm", action="store_true",
                        help="Skip confirmation prompt")
    args = parser.parse_args()

    if not os.path.isfile(args.csv_path):
        print(f"Error: File not found: {args.csv_path}")
        sys.exit(1)

    main(
        args.csv_path,
        source=args.source,
        dry_run=args.dry_run,
        no_confirm=args.no_confirm,
    )
