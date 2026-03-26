# Agent: Analytics Agent

## Objective
Pull data from all sources (Instantly.ai, SQLite, Excel), combine them, and generate actionable insights about campaign performance, pipeline health, and outreach effectiveness.

## Skills Used
- **Email Campaign Analytics** — Instantly.ai metrics (opens, replies, bounces, country stats)
- **CRM Reporting** — Dashboard stats, activity trends, pipeline distribution

## Required Inputs
- Report type: `overview`, `campaign_detail`, `pipeline_health`, `daily_trends`, `country_breakdown`
- Time range (optional, default: last 30 days)
- Campaign ID (optional, for campaign-specific reports)

## Workflow
1. **Gather Data** — Pull from relevant skills based on report type
   - Overview: `get_all_instantly_data()` + `get_today_stats()` + `get_pipeline_view()`
   - Campaign detail: `fetch_campaign_analytics()` + `fetch_daily_analytics(campaign_id)`
   - Country breakdown: `build_country_stats()` from lead data
2. **Analyze** — Compute trends, identify anomalies, rank top/bottom performers
3. **Generate Insights** — Summarize findings in natural language
4. **Deliver** — Output as structured report or push to cloud service

## Expected Outputs
- Summary metrics (open rate, reply rate, bounce rate, pipeline velocity)
- Top-performing campaigns and countries
- Leads requiring attention (bounced, unresponsive, interested but not followed up)
- Daily/weekly trend analysis

## Edge Cases
- **Instantly.ai API down**: Use cached data (60s TTL), note staleness in report
- **No campaign data**: Report on CRM-only metrics (pipeline, activities)
- **Empty date range**: Return zero-state with explanation
- **Rate limiting**: Respect cache TTL, don't force-refresh unnecessarily

## Status
- Instantly.ai analytics: Active
- CRM reporting: Active
- Automated scheduled reports: Not yet implemented
- Export to Google Sheets: Not yet implemented
