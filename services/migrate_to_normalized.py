"""
One-time data migration: flat leads table → companies / locations / contacts.

Usage:
    python -m tools.migrate_to_normalized           # dry-run (prints counts only)
    python -m tools.migrate_to_normalized --execute  # commits to Supabase

Prerequisites:
    Run supabase_migration.sql in the Supabase SQL editor first.
"""

import argparse
import re
import sys
from collections import defaultdict

from core.supabase_client import get_client

# ---------------------------------------------------------------------------
# Domain normalisation
# ---------------------------------------------------------------------------

def _normalize_domain(raw: str) -> str:
    """Strip protocol / www / trailing slash and lowercase."""
    if not raw or not isinstance(raw, str):
        return ""
    d = raw.strip().lower()
    for prefix in ("https://", "http://", "www."):
        if d.startswith(prefix):
            d = d[len(prefix):]
    d = d.split("?")[0].split("#")[0].rstrip("/")
    return d


# ---------------------------------------------------------------------------
# Main migration
# ---------------------------------------------------------------------------

def migrate(execute: bool = False) -> None:
    db = get_client()

    # ------------------------------------------------------------------
    # 1. Load all rows from the existing flat leads table
    # ------------------------------------------------------------------
    print("Loading existing leads …")
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = (
            db.table("leads")
            .select("*")
            .order("created_at", desc=False)   # oldest first → becomes primary
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    print(f"  {len(rows)} lead rows loaded")

    # ------------------------------------------------------------------
    # 2. Build company map  domain → company payload
    #    (oldest row per domain wins for base data)
    # ------------------------------------------------------------------
    company_map: dict[str, dict] = {}   # domain → payload
    skipped_no_domain = 0

    for row in rows:
        raw_domain = row.get("company_website") or row.get("website") or ""
        domain = _normalize_domain(raw_domain)
        if not domain:
            skipped_no_domain += 1
            continue

        if domain not in company_map:
            company_map[domain] = {
                "name":              row.get("company_name") or "",
                "domain":            domain,
                "industry":          row.get("industry") or None,
                "size":              row.get("company_size") or row.get("size") or None,
                "phone":             row.get("phone") or None,
                "linkedin_url":      row.get("company_linkedin") or None,
                "instagram_url":     row.get("company_instagram") or None,
                "facebook_url":      row.get("company_facebook") or None,
                "twitter_url":       row.get("company_twitter") or None,
                "country":           row.get("country") or None,
                "source":            row.get("source") or None,
                "star_rating":       _safe_numeric(row.get("star_rating")),
                "number_of_reviews": _safe_int(row.get("number_of_reviews")),
                "pipeline_stage":    "new",
            }
        else:
            # Fill any null fields from later rows
            existing = company_map[domain]
            for field in ("industry", "size", "phone", "linkedin_url", "instagram_url",
                          "facebook_url", "twitter_url", "country", "source",
                          "star_rating", "number_of_reviews"):
                if not existing.get(field):
                    val = row.get(field) or row.get(field.replace("_url", "").replace("linkedin", "company_linkedin")
                                                         .replace("instagram", "company_instagram")
                                                         .replace("facebook", "company_facebook")
                                                         .replace("twitter", "company_twitter"))
                    if val:
                        existing[field] = val

    print(f"  {len(company_map)} unique companies (by domain)")
    print(f"  {skipped_no_domain} rows skipped (no domain)")

    # ------------------------------------------------------------------
    # 3. Build locations:  domain → set of (city, country) → payload
    # ------------------------------------------------------------------
    # location_map[domain][(city, country)] = payload
    location_map: dict[str, dict[tuple, dict]] = defaultdict(dict)

    for row in rows:
        raw_domain = row.get("company_website") or row.get("website") or ""
        domain = _normalize_domain(raw_domain)
        if not domain:
            continue
        city    = (row.get("city") or "").strip() or None
        country = (row.get("country") or "").strip() or None
        if not city:
            continue
        key = (city.lower(), (country or "").lower())
        if key not in location_map[domain]:
            location_map[domain][key] = {
                "city":           city,
                "state":          row.get("state") or None,
                "country":        country,
                "street_address": row.get("street_address") or None,
                "postal_code":    row.get("postal_code") or None,
                "phone":          None,   # location-level phone not in old schema
            }

    total_locations = sum(len(v) for v in location_map.values())
    print(f"  {total_locations} unique locations")

    # ------------------------------------------------------------------
    # 4. Build contacts  (rows with email)
    # ------------------------------------------------------------------
    contact_map: dict[str, dict] = {}  # email → payload

    for row in rows:
        email = (row.get("email") or "").strip().lower()
        if not email:
            continue
        raw_domain = row.get("company_website") or row.get("website") or ""
        domain = _normalize_domain(raw_domain)
        city    = (row.get("city") or "").strip() or None
        country = (row.get("country") or "").strip() or None

        if email not in contact_map:
            contact_map[email] = {
                "email":                email,
                "first_name":           row.get("first_name") or None,
                "last_name":            row.get("last_name") or None,
                "full_name":            row.get("full_name") or None,
                "title":                row.get("title") or None,
                "phone":                row.get("phone") or None,
                "linkedin_url":         row.get("linkedin") or None,
                "instagram_url":        row.get("instagram") or None,
                "specialty":            row.get("specialty") or None,
                "sub_specialties":      row.get("sub_specialties") or None,
                "email_status":         row.get("email_status") or None,
                "email_opens":          _safe_int(row.get("email_opens")) or 0,
                "email_replies":        _safe_int(row.get("email_replies")) or 0,
                "email_clicks":         _safe_int(row.get("email_clicks")) or 0,
                "email_bounced":        bool(row.get("email_bounced")),
                "last_email_event":     row.get("last_email_event") or None,
                "last_email_event_at":  row.get("last_email_event_at") or None,
                "instantly_synced":     bool(row.get("instantly_synced")),
                "instantly_campaign_id":row.get("instantly_campaign_id") or None,
                "email_platform":       row.get("email_platform") or None,
                "source":               row.get("source") or None,
                "raw_data":             row.get("raw_data") or None,
                "notes":                row.get("notes") or None,
                # We'll fill these after inserting companies/locations
                "_domain":              domain,
                "_city":                city,
                "_country":             country,
            }

    print(f"  {len(contact_map)} unique contacts (by email)")

    # ------------------------------------------------------------------
    # Dry-run summary
    # ------------------------------------------------------------------
    if not execute:
        print("\n[DRY RUN] — no changes written. Re-run with --execute to commit.")
        print(f"  Would create {len(company_map)} companies")
        print(f"  Would create {total_locations} locations")
        print(f"  Would create {len(contact_map)} contacts")
        return

    # ------------------------------------------------------------------
    # 5. Insert companies
    # ------------------------------------------------------------------
    print("\nInserting companies …")
    domain_to_id: dict[str, str] = {}
    companies_created = 0
    companies_existed = 0

    for domain, payload in company_map.items():
        # Skip companies without a real name
        if not payload.get("name"):
            payload["name"] = domain

        try:
            res = db.table("companies").insert(payload).execute()
            domain_to_id[domain] = res.data[0]["id"]
            companies_created += 1
        except Exception as e:
            err = str(e)
            if "23505" in err or "duplicate" in err.lower():
                # Already exists — fetch its id
                res = db.table("companies").select("id").eq("domain", domain).single().execute()
                domain_to_id[domain] = res.data["id"]
                companies_existed += 1
            else:
                print(f"  ERROR inserting company {domain}: {e}")

    print(f"  {companies_created} created, {companies_existed} already existed")

    # ------------------------------------------------------------------
    # 6. Insert locations
    # ------------------------------------------------------------------
    print("Inserting locations …")
    # location_key_to_id: (domain, city_lower, country_lower) → location_id
    location_key_to_id: dict[tuple, str] = {}
    locations_created = 0
    locations_existed = 0

    for domain, city_map in location_map.items():
        company_id = domain_to_id.get(domain)
        if not company_id:
            continue
        for (city_lower, country_lower), payload in city_map.items():
            loc_payload = {**payload, "company_id": company_id}
            try:
                res = db.table("locations").insert(loc_payload).execute()
                location_key_to_id[(domain, city_lower, country_lower)] = res.data[0]["id"]
                locations_created += 1
            except Exception as e:
                err = str(e)
                if "23505" in err or "duplicate" in err.lower():
                    res = (
                        db.table("locations")
                        .select("id")
                        .eq("company_id", company_id)
                        .ilike("city", payload["city"])
                        .execute()
                    )
                    if res.data:
                        location_key_to_id[(domain, city_lower, country_lower)] = res.data[0]["id"]
                    locations_existed += 1
                else:
                    print(f"  ERROR inserting location {payload}: {e}")

    print(f"  {locations_created} created, {locations_existed} already existed")

    # ------------------------------------------------------------------
    # 7. Insert contacts
    # ------------------------------------------------------------------
    print("Inserting contacts …")
    contacts_created = 0
    contacts_existed = 0
    contacts_skipped = 0

    for email, payload in contact_map.items():
        domain  = payload.pop("_domain", "")
        city    = payload.pop("_city", None)
        country = payload.pop("_country", None)

        company_id  = domain_to_id.get(domain) if domain else None
        loc_key     = (domain, (city or "").lower(), (country or "").lower()) if domain and city else None
        location_id = location_key_to_id.get(loc_key) if loc_key else None

        payload["company_id"]  = company_id
        payload["location_id"] = location_id

        # Remove None keys that shouldn't be sent
        clean = {k: v for k, v in payload.items() if v is not None}

        try:
            db.table("contacts").insert(clean).execute()
            contacts_created += 1
        except Exception as e:
            err = str(e)
            if "23505" in err or "duplicate" in err.lower():
                contacts_existed += 1
            else:
                print(f"  ERROR inserting contact {email}: {e}")
                contacts_skipped += 1

    print(f"  {contacts_created} created, {contacts_existed} already existed, {contacts_skipped} errors")

    print("\nMigration complete.")
    print(f"  Companies : {companies_created + companies_existed}")
    print(f"  Locations : {locations_created + locations_existed}")
    print(f"  Contacts  : {contacts_created + contacts_existed}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_numeric(v) -> float | None:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _safe_int(v) -> int | None:
    try:
        return int(float(v)) if v is not None else None
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate flat leads → normalized companies/locations/contacts")
    parser.add_argument("--execute", action="store_true", help="Commit changes (default: dry-run)")
    args = parser.parse_args()
    migrate(execute=args.execute)
