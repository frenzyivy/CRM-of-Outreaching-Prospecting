"""
Dedup Audit Tool
Scans all leads in Supabase, identifies duplicate groups, and optionally merges them.

Usage:
    python -m tools.dedup_audit --report-only   # just show duplicates
    python -m tools.dedup_audit --merge          # interactive merge with confirmation
"""

import argparse
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any

from core.supabase_client import (
    get_client,
    _normalize_linkedin,
    _normalize_phone,
    _normalize_company_name,
    _build_name_key,
)


# ---------------------------------------------------------------------------
# Scoring: which record is "most complete"?
# ---------------------------------------------------------------------------

_COMPLETENESS_FIELDS = [
    "email", "first_name", "last_name", "full_name", "company_name",
    "title", "phone", "linkedin", "website", "city", "state", "country",
    "industry", "notes", "specialty",
]


def _completeness_score(lead: dict) -> int:
    """Count how many standard fields are non-empty."""
    return sum(1 for f in _COMPLETENESS_FIELDS if lead.get(f))


def _pick_primary(leads: list[dict]) -> dict:
    """Pick the best lead to keep: most complete, then earliest created."""
    return max(
        leads,
        key=lambda l: (
            _completeness_score(l),
            -(datetime.fromisoformat(l.get("created_at", "2099-01-01T00:00:00")).timestamp()),
        ),
    )


# ---------------------------------------------------------------------------
# Duplicate Detection
# ---------------------------------------------------------------------------

def find_duplicates(leads: list[dict]) -> list[dict]:
    """
    Multi-pass duplicate detection across all leads.
    Returns a list of duplicate groups, each with match_type, lead_ids, leads, etc.
    """
    grouped_ids: set[str] = set()  # IDs already assigned to a group
    groups: list[dict] = []

    # --- Pass 1: Exact email match ---
    email_map: dict[str, list[dict]] = {}
    for lead in leads:
        email = (lead.get("email") or "").strip().lower()
        if email:
            email_map.setdefault(email, []).append(lead)

    for email, group_leads in email_map.items():
        if len(group_leads) > 1:
            ids = [l["id"] for l in group_leads]
            groups.append({
                "match_type": "email",
                "match_key": email,
                "confidence": "high",
                "lead_ids": ids,
                "leads": group_leads,
                "recommended_primary": _pick_primary(group_leads)["id"],
            })
            grouped_ids.update(ids)

    # --- Pass 2: LinkedIn URL match ---
    linkedin_map: dict[str, list[dict]] = {}
    for lead in leads:
        if lead["id"] in grouped_ids:
            continue
        linkedin = (lead.get("linkedin") or "").strip()
        if linkedin:
            norm = _normalize_linkedin(linkedin)
            if norm and "linkedin.com" in norm:
                linkedin_map.setdefault(norm, []).append(lead)

    for li_key, group_leads in linkedin_map.items():
        if len(group_leads) > 1:
            ids = [l["id"] for l in group_leads]
            groups.append({
                "match_type": "linkedin",
                "match_key": li_key,
                "confidence": "high",
                "lead_ids": ids,
                "leads": group_leads,
                "recommended_primary": _pick_primary(group_leads)["id"],
            })
            grouped_ids.update(ids)

    # --- Pass 3: Phone number match ---
    phone_map: dict[str, list[dict]] = {}
    for lead in leads:
        if lead["id"] in grouped_ids:
            continue
        phone = (lead.get("phone") or "").strip()
        if phone:
            norm = _normalize_phone(phone)
            if len(norm) >= 7:
                phone_map.setdefault(norm, []).append(lead)

    for phone_key, group_leads in phone_map.items():
        if len(group_leads) > 1:
            ids = [l["id"] for l in group_leads]
            groups.append({
                "match_type": "phone",
                "match_key": phone_key,
                "confidence": "medium",
                "lead_ids": ids,
                "leads": group_leads,
                "recommended_primary": _pick_primary(group_leads)["id"],
            })
            grouped_ids.update(ids)

    # --- Pass 4: Fuzzy name + company match ---
    remaining = [l for l in leads if l["id"] not in grouped_ids]
    for i, lead_a in enumerate(remaining):
        if lead_a["id"] in grouped_ids:
            continue
        name_a = _build_name_key(
            lead_a.get("first_name", ""),
            lead_a.get("last_name", ""),
            lead_a.get("full_name", ""),
        )
        company_a = _normalize_company_name(lead_a.get("company_name", ""))
        if not name_a or not company_a:
            continue

        cluster = [lead_a]
        for lead_b in remaining[i + 1:]:
            if lead_b["id"] in grouped_ids:
                continue
            name_b = _build_name_key(
                lead_b.get("first_name", ""),
                lead_b.get("last_name", ""),
                lead_b.get("full_name", ""),
            )
            company_b = _normalize_company_name(lead_b.get("company_name", ""))
            if not name_b or not company_b:
                continue
            if (SequenceMatcher(None, name_a, name_b).ratio() >= 0.85
                    and SequenceMatcher(None, company_a, company_b).ratio() >= 0.85):
                cluster.append(lead_b)

        if len(cluster) > 1:
            ids = [l["id"] for l in cluster]
            groups.append({
                "match_type": "name_company",
                "match_key": f"{name_a} @ {company_a}",
                "confidence": "low",
                "lead_ids": ids,
                "leads": cluster,
                "recommended_primary": _pick_primary(cluster)["id"],
            })
            grouped_ids.update(ids)

    return groups


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def report_duplicates(groups: list[dict]) -> str:
    """Format duplicate groups into a readable report."""
    if not groups:
        return "No duplicates found."

    lines = [
        f"Found {len(groups)} duplicate group(s):",
        "=" * 70,
    ]

    for i, g in enumerate(groups, 1):
        lines.append(f"\nGroup {i} — {g['match_type']} match ({g['confidence']} confidence)")
        lines.append(f"  Key: {g['match_key']}")
        lines.append(f"  Recommended primary: {g['recommended_primary']}")
        lines.append(f"  Records ({len(g['leads'])}):")
        for lead in g["leads"]:
            primary_tag = " <-- PRIMARY" if lead["id"] == g["recommended_primary"] else ""
            name = lead.get("full_name") or f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
            lines.append(
                f"    [{lead['id'][:8]}…]{primary_tag}  "
                f"{name or '(no name)'}  |  "
                f"{lead.get('email') or '(no email)'}  |  "
                f"{lead.get('company_name') or '(no company)'}  |  "
                f"fields: {_completeness_score(lead)}/{len(_COMPLETENESS_FIELDS)}"
            )
        lines.append("-" * 70)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------

def merge_duplicate_group(group: dict, dry_run: bool = True) -> dict:
    """
    Merge a duplicate group: keep the primary, merge data from secondaries,
    reassign references, delete secondaries.

    Returns a summary dict.
    """
    primary_id = group["recommended_primary"]
    primary = next(l for l in group["leads"] if l["id"] == primary_id)
    secondaries = [l for l in group["leads"] if l["id"] != primary_id]
    secondary_ids = [l["id"] for l in secondaries]

    # Build merged data: fill empty fields in primary from secondaries
    update_data: dict[str, Any] = {}
    for sec in secondaries:
        for field in _COMPLETENESS_FIELDS:
            if not primary.get(field) and sec.get(field):
                update_data.setdefault(field, sec[field])

    # Merge raw_data
    primary_raw = primary.get("raw_data") or {}
    merged_raw = {**primary_raw}
    for sec in secondaries:
        for k, v in (sec.get("raw_data") or {}).items():
            if k not in merged_raw or not merged_raw[k]:
                merged_raw[k] = v
    if merged_raw != primary_raw:
        update_data["raw_data"] = merged_raw

    summary = {
        "primary_id": primary_id,
        "secondary_ids": secondary_ids,
        "fields_filled": list(update_data.keys()),
        "dry_run": dry_run,
    }

    if dry_run:
        return summary

    db = get_client()

    # 1. Update primary with merged data
    if update_data:
        db.table("leads").update(update_data).eq("id", primary_id).execute()

    # 2. Reassign activities from secondaries to primary
    for sid in secondary_ids:
        try:
            db.table("activities").update({"lead_id": primary_id}).eq("lead_id", sid).execute()
        except Exception:
            pass

    # 3. Reassign lead_stages from secondaries to primary
    for sid in secondary_ids:
        try:
            db.table("lead_stages").delete().eq("lead_id", sid).execute()
        except Exception:
            pass

    # 4. Reassign any leads whose company_id points to a secondary
    for sid in secondary_ids:
        try:
            db.table("leads").update({"company_id": primary_id}).eq("company_id", sid).execute()
        except Exception:
            pass

    # 5. Delete secondary leads
    for sid in secondary_ids:
        try:
            db.table("leads").delete().eq("id", sid).execute()
        except Exception as e:
            summary.setdefault("errors", []).append(f"Failed to delete {sid}: {e}")

    # 6. Log merge activity on primary
    try:
        db.table("activities").insert({
            "lead_id": primary_id,
            "activity_type": "merge",
            "description": f"Merged with duplicate lead(s): {', '.join(s[:8] for s in secondary_ids)}",
            "created_at": datetime.now().isoformat(),
        }).execute()
    except Exception:
        pass

    summary["merged"] = True
    return summary


# ---------------------------------------------------------------------------
# Main audit runner
# ---------------------------------------------------------------------------

def run_audit(auto_merge: bool = False) -> dict:
    """
    Run a full dedup audit against all leads in Supabase.
    Returns report with duplicate groups found.
    """
    db = get_client()

    print("Fetching all leads from Supabase...")
    result = db.table("leads").select("*").execute()
    all_leads = result.data or []
    print(f"Total leads: {len(all_leads)}")

    groups = find_duplicates(all_leads)
    report = report_duplicates(groups)
    print(report)

    total_duplicates = sum(len(g["lead_ids"]) - 1 for g in groups)

    if not groups:
        return {"total_leads": len(all_leads), "duplicate_groups": 0, "total_duplicates": 0}

    if auto_merge:
        merged_count = 0
        for i, g in enumerate(groups, 1):
            # Show dry-run first
            dry = merge_duplicate_group(g, dry_run=True)
            print(f"\nGroup {i} merge plan:")
            print(f"  Keep: {dry['primary_id'][:8]}…")
            print(f"  Delete: {[s[:8] + '…' for s in dry['secondary_ids']]}")
            print(f"  Fields to fill: {dry['fields_filled']}")

            confirm = input("  Proceed with merge? [y/N]: ").strip().lower()
            if confirm == "y":
                result = merge_duplicate_group(g, dry_run=False)
                print(f"  Merged successfully.")
                merged_count += 1
            else:
                print(f"  Skipped.")

        print(f"\nDone. Merged {merged_count}/{len(groups)} group(s).")
        return {
            "total_leads": len(all_leads),
            "duplicate_groups": len(groups),
            "total_duplicates": total_duplicates,
            "merged": merged_count,
        }

    return {
        "total_leads": len(all_leads),
        "duplicate_groups": len(groups),
        "total_duplicates": total_duplicates,
        "groups": groups,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deduplicate leads in Supabase")
    parser.add_argument("--merge", action="store_true", help="Interactively merge duplicates")
    parser.add_argument("--report-only", action="store_true", help="Only print report, no changes")
    args = parser.parse_args()

    run_audit(auto_merge=args.merge and not args.report_only)
