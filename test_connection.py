#!/usr/bin/env python
"""Quick test of Supabase connection."""

from dotenv import load_dotenv
load_dotenv()

from core.supabase_client import get_client, get_lead_count, get_leads

try:
    client = get_client()
    print("SUCCESS: Supabase connected!")
    counts = get_lead_count()
    print(f"Total leads in DB: {counts['total']}")
    print(f"  Companies: {counts['company']}")
    print(f"  Contacts: {counts['contact']}")
    print(f"  Leads: {counts['lead']}")
    print("\nSample leads:")
    sample = get_leads()[:3]
    for i, lead in enumerate(sample, 1):
        print(f"  {i}. {lead.get('full_name', lead.get('company_name', 'N/A'))}")
    print("\nMigration successful! Ready to start server.")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
