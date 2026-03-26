# Agent: Pipeline Manager Agent

## Objective
Monitor pipeline health, identify stale leads, suggest follow-up actions, and ensure leads are progressing through stages at a healthy pace.

## Skills Used
- **Pipeline Operations** — Read/update stages, query activity history
- **CRM Reporting** — Pipeline view, activity stats
- **Lead Management** — Full lead detail for context

## Required Inputs
- Check type: `stale_leads`, `follow_up_due`, `pipeline_summary`, `stage_bottleneck`
- Staleness threshold (optional, default: 7 days with no activity)

## Workflow

### Stale Lead Detection
1. Get all leads via `get_pipeline_view()`
2. For each lead not in `closed_won` or `closed_lost`, check last activity via `get_activities()`
3. Flag leads with no activity beyond the staleness threshold
4. Suggest next action based on current stage

### Follow-up Suggestions
| Current Stage | Suggested Action |
|---------------|-----------------|
| `new` | Research the lead |
| `researched` | Send initial outreach email |
| `email_sent` | Send follow-up 1 (after 3-5 days) |
| `follow_up_1` | Send follow-up 2 (after 5-7 days) |
| `follow_up_2` | Mark as cold or try different channel |
| `responded` | Schedule a meeting |
| `meeting` | Send proposal |
| `proposal` | Follow up on proposal (after 3 days) |

### Pipeline Bottleneck Analysis
1. Get `stage_counts` from `get_pipeline_view()`
2. Identify stages with disproportionately high counts
3. Calculate conversion rates between stages
4. Flag bottleneck stages with recommendations

## Expected Outputs
- List of stale leads with last activity date and suggested action
- Follow-up queue sorted by urgency
- Pipeline health summary (leads per stage, conversion rates, bottlenecks)

## Edge Cases
- **No activities in DB**: All leads appear stale — suggest initial outreach campaign
- **All leads in `new`**: Pipeline hasn't started — recommend bulk research + outreach
- **High bounce rate from Email Analytics**: Flag email quality issue before suggesting more outreach

## Status
- Pipeline monitoring: Active (manual trigger)
- Automated daily checks: Not yet implemented
- Slack/email notifications for stale leads: Not yet implemented
