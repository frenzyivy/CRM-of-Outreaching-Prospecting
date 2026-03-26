# Skill: Email Campaign Analytics

## Objective
Fetch, cache, and analyze email campaign data from Instantly.ai — including campaign metrics, daily trends, lead engagement, and country breakdowns.

## Tools Used
- `tools/instantly.py` — Instantly.ai API v2 integration (Bearer token auth)

## Available Functions

### Core Data Fetchers
| Function | Purpose | Returns |
|----------|---------|---------|
| `get_all_instantly_data(force=False)` | **Main entry point** — fetches everything, cached 60s | Full data dict (overview, campaigns, analytics, daily, leads, country stats) |
| `fetch_campaigns()` | List all campaigns with status labels | `[{id, name, status, status_label}]` |
| `fetch_analytics_overview()` | Aggregated totals across all campaigns | Dict with sends, opens, replies, clicks, bounce + pre-computed rates |
| `fetch_campaign_analytics()` | Per-campaign analytics with computed rates | `[{campaign_id, campaign_name, emails_sent, opens, replies, ...}]` |
| `fetch_daily_analytics(campaign_id, days=30)` | Daily time-series analytics | `[{date, sent, opened, replies, clicks, bounced}]` |
| `fetch_all_leads(campaign_id, max_pages=10)` | All leads with engagement data | `[{email, company_name, country, status_label, interest_label, ...}]` |

### Derived Analytics
| Function | Purpose | Returns |
|----------|---------|---------|
| `build_country_stats(leads)` | Aggregate leads by country | `[{country, total_leads, open_rate, reply_rate, ...}]` |
| `build_lead_status_breakdown(leads)` | Count leads by interest/status | `{by_interest: {...}, by_status: {...}, total: int}` |

## Required Environment
- `INSTANTLY_API_KEY` — Bearer token for Instantly.ai API v2

## Status Mappings
- **Campaign Status**: Draft, Active, Paused, Completed, Suspended, etc.
- **Lead Status**: Active, Paused, Completed, Bounced, Unsubscribed, Skipped
- **Lead Interest**: Out of Office, Interested, Meeting Booked, Won, Not Interested, Lost, etc.

## Notes
- Cache TTL is 60 seconds; use `force=True` to bypass
- Country is extracted from lead payload fields, with TLD-based fallback for domain guessing
- Pagination: `fetch_all_leads()` paginates up to 10 pages (1000 leads max)
- All API errors are caught and returned inline (check for `"error"` key in results)