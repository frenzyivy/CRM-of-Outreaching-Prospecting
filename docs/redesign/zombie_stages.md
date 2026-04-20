# Stage Utilization Audit — 2026-04-20

Snapshot of `lead_stages` counts at the time of Phase 2 review.

## Actual numbers (query: full scan of lead_stages + leads)

| # | Stage | Count | Last change | Status |
|---|-------|-------|-------------|--------|
| 1 | `new` | 6043 | never (implicit default) | STALE |
| 2 | `researched` | 0 | — | EMPTY |
| 3 | `email_sent` | 2 | 2026-04-20 | ACTIVE |
| 4 | `follow_up_1` | 2 | 2026-04-20 | ACTIVE |
| 5 | `follow_up_2` | 0 | — | EMPTY |
| 6 | `responded` | 0 | — | EMPTY |
| 7 | `meeting` | 0 | — | EMPTY |
| 8 | `proposal` | 0 | — | EMPTY |
| 9 | `free_trial` | 0 | — | EMPTY |
| 10 | `closed_won` | 0 | — | EMPTY |
| 11 | `closed_lost` | 0 | — | EMPTY |

- Total leads: **6,047**
- Leads with an explicit `lead_stages` row: **4** (2 in email_sent, 2 in follow_up_1)
- Leads defaulting to `'new'` via the LEFT JOIN fallback: **6,043**

## Reading the snapshot

The pipeline is effectively **unused** in production right now — only 4 leads have been progressed manually, and those happened today (2026-04-20). The 6 closed-won clients you mentioned during discovery (Dr. Alvarez, Klinika Derma Warsaw, Mueller Praxis, Madrid Aesthetics, Milan Laser, Gameday Men's Health) are NOT reflected in `lead_stages`. They exist somewhere else — either not yet represented in CRM pipeline stages, or tracked only in your head / Notion.

That's *useful context* for Phase 5 (Revenue page): when we build the `deals` table and the manual deal-entry form, the 6 existing clients will need to be back-filled there, and optionally their leads moved into `closed_won`.

## Zombie stage candidates

**Definition:** count=0 AND no lead has ever been in this stage (no historical activity).

By that definition, **every stage except `new`, `email_sent`, `follow_up_1` is technically a zombie today**. But that's misleading — most of them are inactive because you haven't used the CRM heavily yet, not because they're obsolete.

The one that stands out regardless of data: `free_trial`.

### free_trial — codebase references

Found 19 references across 13 files. Not a single-reference zombie. It's plumbed end-to-end:

- `core/constants.py:21,35` — enum + display label
- `core/supabase_client.py:875` — lead scoring weight (75)
- `api/dashboard.py:71,72,78,98` — dashboard KPI `free_trial_count` + `outreach_to_trial` conversion rate
- `api/pipeline.py:49` — stage weight (0.80) for weighted pipeline placeholder I added in Phase 2
- `server.py:156,157,163,183` — legacy server still has the same dashboard logic (duplicates api/dashboard.py)
- `frontend/src/types/index.ts:175` — DashboardStats.free_trial_count type
- `frontend/src/components/pipeline/PipelineColumn.tsx:28` — stage dot color
- `frontend/src/components/common/Badge.tsx:12` — badge color
- `frontend/src/components/dashboard/DashboardPage.tsx:29,88` — "Free Trial Started" KPI tile
- `frontend/src/components/dashboard/DashboardFilters.tsx:18` — filter option
- `frontend/src/components/leads/CompanyTable.tsx:10,22` — stage label + color
- `frontend/src/components/leads/CompanyDetailDrawer.tsx:22,36` — dropdown option + color
- `frontend/src/components/leads/LeadDetailDrawer.tsx:26` — dropdown option

### Recommendation

**Do not archive anything now.** Two reasons:

1. The pipeline has only been meaningfully used since today. We need real data before declaring any stage obsolete. Revisit this audit in 60–90 days.
2. `free_trial` appears intentional — there's a dedicated KPI tile for it on the dashboard and it's in the stage-score ladder. It looks like a stage you *planned to use* for the "Free Trial Started" metric that also has no data behind it right now.

**What to do instead:**
- Decide whether `free_trial` is part of your workflow or just aspirational. If aspirational → leave it, it's fine to have.
- Start actually progressing leads through stages (drag-drop now works after Phase 2 — once the perf pass lands, it'll be fast enough to actually use).
- Re-run this audit when we do Phase 5 Revenue work — by then you'll have the 6 closed_won deals in the system and we'll have real distribution to audit against.

### If you later want to remove `free_trial`

Touch points (in order of dependency risk):
1. `core/constants.py` PIPELINE_STAGES + STAGE_LABELS — remove list entry + label
2. `core/supabase_client.py:875` STAGE_SCORES — remove score weight
3. `api/pipeline.py:49` STAGE_WEIGHTS — remove weight
4. `api/dashboard.py` + `server.py` — remove `free_trial_count` + `outreach_to_trial` computation, or reroute to a different stage
5. `frontend/src/types/index.ts` — remove `free_trial_count` from DashboardStats
6. All frontend stage color / label / dropdown maps — remove the 7 references
7. `frontend/src/components/dashboard/DashboardPage.tsx` — remove the "Free Trial Started" KPI tile entirely, OR replace with a different metric
8. Database: `ALTER TABLE lead_stages ... REMOVE CHECK constraint if any`. Today there's no check constraint on `lead_stages.stage`, so no DB change needed — old rows (if any existed) would just become orphan enum values.

Not a 5-minute change. Let it stay until Phase 5 when we re-evaluate the whole scoring ladder.
