# Skill: CRM Reporting

## Objective
Generate dashboard statistics, chart data, and activity summaries for the CRM frontend.

## Tools Used
- `tools/db_manager.py` — SQLite queries for stats and chart data
- `tools/lead_merger.py` — Pipeline view with lead counts by stage

## Available Functions

### Dashboard Stats
| Function | Purpose | Returns |
|----------|---------|---------|
| `get_today_stats(db_path)` | Today's activity counts | `{emails_today, calls_today, outreaches_today, notes_today, stage_changes_today}` |
| `get_chart_data(db_path, days=30)` | Daily activity trends (last N days) | `[{day, emails, calls, notes}]` |

### Pipeline Reporting
| Function | Purpose | Returns |
|----------|---------|---------|
| `get_pipeline_view(excel_path, db_path)` | All leads grouped by stage | `{stages: {stage: [leads]}, stage_counts: {...}, stage_order: [...]}` |

### Activity Queries
| Function | Purpose | Returns |
|----------|---------|---------|
| `get_activities(db_path, lead_type, lead_key, activity_type, limit=50)` | Query activities with optional filters | `[{id, lead_type, lead_key, activity_type, description, created_at}]` |

## API Endpoints That Use This Skill
- `GET /api/dashboard/stats` — calls `get_today_stats()` + lead count from `merge_leads_with_stages()`
- `GET /api/dashboard/chart-data` — calls `get_chart_data()`
- `GET /api/pipeline` — calls `get_pipeline_view()`

## Notes
- Chart data is pivoted into `{day, emails, calls, notes}` format for Recharts consumption
- Stats combine SQLite activity counts with Excel lead totals
- All dates are ISO format strings