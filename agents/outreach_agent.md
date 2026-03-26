# Agent: Outreach Agent

## Objective
Orchestrate the full outreach lifecycle — from researching a lead to sending personalized emails and managing follow-up sequences.

## Skills Used
- **Lead Management** — Pull lead data (company info, contacts, history)
- **Pipeline Operations** — Update stages, log email/call activities
- **Email Campaign Analytics** — Monitor campaign performance and engagement

## Required Inputs
- Target lead(s): company name or contact email
- Outreach goal: initial contact, follow-up, meeting request, etc.
- Email template or tone guidance (optional)

## Workflow
1. **Research** — Use Lead Management skill to pull full lead detail (`get_lead_detail()`)
2. **Check Stage** — Verify current pipeline stage to determine appropriate action
3. **Draft Email** — Compose personalized outreach based on lead data and stage
4. **Send/Queue** — Route through Instantly.ai campaign or direct Gmail (when configured)
5. **Log Activity** — Use Pipeline Operations to log email sent and advance stage
6. **Monitor** — Use Email Campaign Analytics to track opens/replies
7. **Follow-up** — If no response within threshold, trigger next follow-up stage

## Expected Outputs
- Personalized email draft (for review or auto-send)
- Updated pipeline stage
- Activity log entry
- Engagement tracking via Instantly.ai

## Edge Cases
- **Lead has no email**: Flag for manual research, do not attempt outreach
- **Lead already in `responded` or later stage**: Skip automated outreach, flag for manual handling
- **Instantly.ai API error**: Log the failure, keep lead in current stage, retry on next run
- **Duplicate outreach risk**: Check `get_activities()` for recent emails before sending

## Status
- Email drafting: Manual (agent assists with composition)
- Instantly.ai integration: Active
- Gmail direct send: Pending (awaiting Google OAuth setup)
- Apollo enrichment before outreach: Pending
