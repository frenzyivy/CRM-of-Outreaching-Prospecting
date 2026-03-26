# Agent: Lead Enrichment Agent

## Objective
Enrich existing leads with additional data from Apollo.io — including verified emails, job titles, company size, funding info, and social profiles.

## Skills Used
- **Lead Management** — Read current lead data to identify gaps

## Tools Needed (Not Yet Built)
- `tools/apollo.py` — Apollo.io API integration (to be created)
  - People search by company domain
  - People enrichment by email
  - Company enrichment by domain
  - Bulk enrichment endpoint

## Required Inputs
- Lead type: `company` or `contact`
- Identifier: company domain, contact email, or lead ID
- Enrichment scope: `basic` (name, title, email) or `full` (+ company details, funding, social)

## Workflow
1. **Read Lead** — Use Lead Management to get current lead data
2. **Identify Gaps** — Check which fields are empty or outdated
3. **Call Apollo API** — Enrich with missing data
4. **Merge Results** — Update lead record with enriched fields
5. **Log Activity** — Record enrichment as a note activity

## Expected Outputs
- Enriched lead data with filled gaps
- Confidence scores for enriched fields (if Apollo provides them)
- Activity log entry noting what was enriched

## Edge Cases
- **Apollo API key not set**: Return clear error, do not attempt enrichment
- **Lead not found in Apollo**: Log as "not enrichable", move on
- **Rate limiting**: Apollo has credit-based pricing — check with user before bulk enrichment
- **Conflicting data**: Prefer Apollo data for professional fields, keep existing data for custom notes

## Required Environment
- `APOLLO_API_KEY` — Currently pending setup in `.env`

## Status
- **Not yet active** — Awaiting Apollo API key and `tools/apollo.py` creation
- Lead Management skill (for reading leads): Active
