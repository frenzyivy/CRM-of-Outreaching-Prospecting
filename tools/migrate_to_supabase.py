"""
Migration Tool: Excel + SQLite → Supabase
Run once to move existing data into Supabase.

Usage:
    python -m tools.migrate_to_supabase
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.excel_reader import read_leads
from tools.db_manager import get_all_stages, get_activities as get_sqlite_activities
from tools.supabase_client import get_client, upsert_lead, set_lead_stage, log_activity


EXCEL_PATH = os.getenv("EXCEL_FILE_PATH", "data/master_leads.xlsx")
DB_PATH = os.getenv("SQLITE_DB_PATH", "data/crm_metadata.db")


def migrate():
    print("=" * 60)
    print("Migration: Excel + SQLite -> Supabase")
    print("=" * 60)

    db = get_client()

    # ----- Step 1: Migrate Excel leads -----
    print("\n[1/3] Reading Excel leads...")
    data = read_leads(EXCEL_PATH, force=True)

    if data.get("error"):
        print(f"  Warning: {data['error']}")

    all_leads = []
    for lead_type_key in ("companies", "contacts", "leads"):
        all_leads.extend(data.get(lead_type_key, []))

    print(f"  Found {len(all_leads)} leads in Excel")

    migrated = 0
    skipped = 0
    errors = 0
    # Map old hash IDs to new UUIDs for stage/activity migration
    old_to_new: dict[str, str] = {}

    for lead in all_leads:
        old_id = lead.get("id", "")
        lead_type = lead.get("lead_type", "lead")

        # Build Supabase-compatible dict
        supa_lead = {
            "lead_type": lead_type,
            "email": str(lead.get("email", "")).strip().lower() or None,
            "first_name": str(lead.get("first_name", "")),
            "last_name": str(lead.get("last_name", "")),
            "full_name": str(lead.get("full_name", "")),
            "company_name": str(lead.get("company_name", lead.get("company", ""))),
            "title": str(lead.get("title", "")),
            "phone": str(lead.get("phone", "")),
            "linkedin": str(lead.get("linkedin", lead.get("linkedin_url", ""))),
            "website": str(lead.get("website", lead.get("domain", ""))),
            "city": str(lead.get("city", "")),
            "state": str(lead.get("state", "")),
            "country": str(lead.get("country", "")),
            "industry": str(lead.get("industry", "")),
            "notes": str(lead.get("notes", "")),
            "source": "excel_migration",
        }

        # Collect extra fields in raw_data
        known = set(supa_lead.keys()) | {"id", "lead_type", "raw_data"}
        raw = {k: str(v) for k, v in lead.items() if k not in known and v != ""}
        if raw:
            supa_lead["raw_data"] = raw

        # Skip leads without any identifying data
        if not supa_lead.get("email") and not supa_lead.get("company_name") and not supa_lead.get("first_name"):
            skipped += 1
            continue

        try:
            result = upsert_lead(supa_lead)
            new_id = result.get("id", "")
            if new_id and old_id:
                old_to_new[f"{lead_type}:{old_id}"] = new_id
            migrated += 1
        except Exception as e:
            print(f"  Error migrating {supa_lead.get('email', 'unknown')}: {e}")
            errors += 1

    print(f"  Migrated: {migrated}, Skipped: {skipped}, Errors: {errors}")

    # ----- Step 2: Migrate pipeline stages -----
    print("\n[2/3] Migrating pipeline stages from SQLite...")
    stages = get_all_stages(DB_PATH)
    stage_migrated = 0

    for s in stages:
        old_key = f"{s['lead_type']}:{s['lead_key']}"
        new_id = old_to_new.get(old_key)
        if not new_id:
            continue
        try:
            set_lead_stage(new_id, s["stage"])
            stage_migrated += 1
        except Exception as e:
            print(f"  Error migrating stage for {old_key}: {e}")

    print(f"  Migrated {stage_migrated} / {len(stages)} stage records")

    # ----- Step 3: Migrate activities -----
    print("\n[3/3] Migrating activity history from SQLite...")
    activities = get_sqlite_activities(DB_PATH, limit=10000)
    act_migrated = 0

    for act in activities:
        old_key = f"{act['lead_type']}:{act['lead_key']}"
        new_id = old_to_new.get(old_key)
        if not new_id:
            continue
        try:
            log_activity(new_id, act["activity_type"], act.get("description", ""))
            act_migrated += 1
        except Exception as e:
            print(f"  Error migrating activity: {e}")

    print(f"  Migrated {act_migrated} / {len(activities)} activity records")

    # ----- Done -----
    print("\n" + "=" * 60)
    print("Migration complete!")
    print(f"  Leads: {migrated}")
    print(f"  Stages: {stage_migrated}")
    print(f"  Activities: {act_migrated}")
    print("=" * 60)
    print("\nYou can now start the server — it will use Supabase instead of Excel/SQLite.")
    print("The old Excel and SQLite files are untouched as a backup.")


if __name__ == "__main__":
    migrate()
