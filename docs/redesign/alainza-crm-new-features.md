# Alainza CRM — New Features Spec

**Target stack:** Next.js/Vite + FastAPI + Supabase (existing)
**Design system:** Alainza CRM v3 (dual-theme, see `alainza-crm-design-system.md`)
**Deliverable:** Add these 9 features to the existing CRM without removing or breaking any existing functionality.
**Owner:** Komal (@theaigirlhere) · Alainza Bizz

---

## Prime directive for the implementer

This spec **adds** capabilities. It does **not** remove or replace existing views.

Before you start:

1. Read the existing routing, component structure, and Supabase schema.
2. For every feature below, check whether a similar table/view/endpoint already exists. If it does, extend it. Don't duplicate.
3. All new code must match the existing visual design in `alainza-crm-design-system.md` — dual theme (dark blue + light blue/white), Geist + Geist Mono + Instrument Serif fonts, CSS variables for colors.
4. Mobile responsive. All new components must collapse cleanly under 980px.
5. Every new component must be reachable from the existing sidebar — no orphan routes.

---

## Feature map — where each feature lives

| # | Feature | View / page | Position |
|---|---------|-------------|----------|
| 1 | Champion Leads | `/today` (Dashboard) | Above existing KPI grid |
| 2 | April Goals Progress | `/today` | 3-col row with Streak + Digest |
| 3 | Daily Digest (Yesterday's Recap) | `/today` | 3-col row (rightmost) |
| 4 | Activity Streak | `/today` | 3-col row (middle) |
| 5 | Winning Patterns | `/performance` | Below segment breakdown |
| 6 | Best Time Heatmap | `/performance` | Below segment breakdown (right col) |
| 7 | Subject Line Graveyard | `/performance` | Bottom of page |
| 8 | Lead Leakage Report | `/pipeline` | Below weighted pipeline summary |
| 9 | Objection Handler Library | `/inbox` (Unified Inbox) | Below thread pane |

---

## 1 · Champion Leads

### Purpose
Show the top 6-10 highest-intent leads in the pipeline, sorted by a computed intent score. These are the "close this week or lose momentum" list.

### Location
`/today` — inserted between the priority queue card and the KPI grid.

### Supabase

**New view:** `v_champion_leads`

```sql
CREATE OR REPLACE VIEW v_champion_leads AS
WITH lead_signals AS (
  SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    l.company_id,
    c.name AS company_name,
    l.stage,
    l.country,
    -- Signal counts (last 30 days)
    COUNT(DISTINCT CASE WHEN t.type = 'email_open' AND t.created_at > NOW() - INTERVAL '30 days' THEN t.id END) AS opens_30d,
    COUNT(DISTINCT CASE WHEN t.type = 'link_click' AND t.created_at > NOW() - INTERVAL '30 days' THEN t.id END) AS clicks_30d,
    COUNT(DISTINCT CASE WHEN t.type = 'email_reply' AND t.created_at > NOW() - INTERVAL '30 days' THEN t.id END) AS replies_30d,
    -- Sentiment from latest reply
    (SELECT sentiment_score FROM touchpoints WHERE lead_id = l.id AND type = 'email_reply' ORDER BY created_at DESC LIMIT 1) AS latest_sentiment,
    -- Days since last touch
    EXTRACT(DAY FROM NOW() - MAX(t.created_at)) AS days_since_touch,
    -- Has a meeting booked
    EXISTS(SELECT 1 FROM meetings m WHERE m.lead_id = l.id AND m.starts_at > NOW()) AS has_upcoming_meeting,
    -- Has viewed proposal
    EXISTS(SELECT 1 FROM touchpoints WHERE lead_id = l.id AND type = 'proposal_view' AND created_at > NOW() - INTERVAL '14 days') AS viewed_proposal
  FROM leads l
  LEFT JOIN companies c ON l.company_id = c.id
  LEFT JOIN touchpoints t ON t.lead_id = l.id
  WHERE l.stage NOT IN ('Closed', 'Lost', 'Unsubscribed')
  GROUP BY l.id, l.first_name, l.last_name, l.email, l.company_id, c.name, l.stage, l.country
),
scored AS (
  SELECT
    *,
    LEAST(100, GREATEST(0,
      (opens_30d * 3) +
      (clicks_30d * 8) +
      (replies_30d * 15) +
      (CASE WHEN latest_sentiment IS NOT NULL THEN latest_sentiment * 20 ELSE 0 END) +
      (CASE WHEN has_upcoming_meeting THEN 15 ELSE 0 END) +
      (CASE WHEN viewed_proposal THEN 20 ELSE 0 END) +
      (CASE WHEN days_since_touch < 2 THEN 10 ELSE 0 END)
    ))::int AS intent_score
  FROM lead_signals
)
SELECT * FROM scored
WHERE intent_score >= 60
ORDER BY intent_score DESC
LIMIT 20;
```

### API endpoint

`GET /api/champion-leads`

Response:
```json
{
  "leads": [
    {
      "id": "uuid",
      "name": "Gameday Men's Health",
      "company": "Gameday Men's Health",
      "intent_score": 94,
      "primary_signal": "Opened 6× · proposal viewed · sentiment +0.82",
      "suggested_action": "close",
      "cta_label": "Close →"
    }
  ]
}
```

### Frontend component

`<ChampionLeads />` — React component rendering a card with up to 6 lead rows in a 2-column grid. Each row shows:
- Score badge (color-coded: 90+ green, 80-89 blue, 70-79 purple)
- Lead name + primary signal
- Context-aware CTA button: "Close →" if score > 90, "Reply →" if latest signal is an unanswered reply, "Prep →" if meeting upcoming, "View" otherwise

Clicking a row opens the lead detail drawer. Clicking the CTA triggers the suggested action (open reply composer / open meeting prep / open proposal).

### Acceptance
- View renders within 400ms for 6,000+ leads (use the materialized view pattern if slow)
- Intent score recomputes nightly in a cron job
- Component matches the CSS spec (gradient border-left, hover lift, score color tiers)

---

## 2 · Goals Progress

### Purpose
Show monthly targets (MRR, meetings, replies, outreach volume) with progress bars and pace indicators. Replaces the "how am I doing this month" question with a glanceable answer.

### Location
`/today` — left column of the 3-col row below Champion Leads.

### Supabase

**New table:** `goals`

```sql
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  metric text NOT NULL,  -- 'mrr', 'meetings_booked', 'replies_received', 'outreach_volume'
  target_value numeric NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_goals_unique ON goals(user_id, period_type, period_start, metric);
```

**View:** `v_goal_progress`

```sql
CREATE OR REPLACE VIEW v_goal_progress AS
SELECT
  g.id,
  g.metric,
  g.target_value,
  g.period_start,
  g.period_end,
  CASE g.metric
    WHEN 'mrr' THEN (SELECT COALESCE(SUM(monthly_amount), 0) FROM deals WHERE status = 'active' AND started_at <= g.period_end)
    WHEN 'meetings_booked' THEN (SELECT COUNT(*) FROM meetings WHERE booked_at BETWEEN g.period_start AND g.period_end)
    WHEN 'replies_received' THEN (SELECT COUNT(*) FROM touchpoints WHERE type = 'email_reply' AND created_at BETWEEN g.period_start AND g.period_end)
    WHEN 'outreach_volume' THEN (SELECT COUNT(*) FROM touchpoints WHERE type IN ('email_sent','wa_sent','call_made','li_message') AND created_at BETWEEN g.period_start AND g.period_end)
  END AS current_value,
  EXTRACT(DAY FROM g.period_end - CURRENT_DATE) AS days_remaining,
  EXTRACT(DAY FROM CURRENT_DATE - g.period_start) AS days_elapsed,
  EXTRACT(DAY FROM g.period_end - g.period_start) AS days_total
FROM goals g
WHERE CURRENT_DATE BETWEEN g.period_start AND g.period_end;
```

### API

- `GET /api/goals/current` — current period's goals with progress
- `POST /api/goals` — create/update a goal

### Pace logic (backend or frontend)

```
pace_expected = (days_elapsed / days_total) * target_value
on_pace = current_value >= pace_expected * 0.9
ahead = current_value >= pace_expected * 1.1
behind = current_value < pace_expected * 0.9
```

Color tiers:
- On pace or ahead → success (green)
- Slightly behind (80-90% of pace) → warn (amber)
- Well behind (<80% of pace) → danger (red)

### Frontend

`<GoalsCard />` — 4 rows, each showing goal name, percentage complete, progress bar (animated fill), and a subtext line ("€3,200 of €4,800 · need 2 more clients" / "ahead of pace" / "slightly behind").

---

## 3 · Daily Digest (Yesterday's Recap)

### Purpose
Auto-generated end-of-day summary. Shows 4 stat tiles (emails sent, replies, meetings, closed won) plus 3 AI-generated highlight bullets. Optional email/Slack delivery at a chosen time.

### Location
`/today` — rightmost column of 3-col row.

### Supabase

**New table:** `daily_digests`

```sql
CREATE TABLE daily_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  digest_date date NOT NULL,
  stats jsonb NOT NULL,  -- {emails_sent, replies, meetings, closed_won, ...}
  highlights jsonb NOT NULL,  -- [{type: 'up'|'down'|'neutral', text: '...'}]
  generated_at timestamptz DEFAULT NOW(),
  delivered_via text[],  -- ['email', 'slack', 'whatsapp']
  UNIQUE(user_id, digest_date)
);
```

### Cron job

Every evening at 6pm local (configurable per-user):

```python
# FastAPI background worker — run via apscheduler
async def generate_daily_digest(user_id: str):
    yesterday = (datetime.now() - timedelta(days=1)).date()

    stats = await db.fetchrow("""
      SELECT
        COUNT(*) FILTER (WHERE type IN ('email_sent','wa_sent','li_message')) AS touches_sent,
        COUNT(*) FILTER (WHERE type = 'email_reply') AS replies,
        (SELECT COUNT(*) FROM meetings WHERE DATE(starts_at) = $1) AS meetings,
        (SELECT COUNT(*) FROM deals WHERE DATE(closed_at) = $1 AND status = 'won') AS closed_won
      FROM touchpoints
      WHERE DATE(created_at) = $1 AND user_id = $2
    """, yesterday, user_id)

    # Call Claude API to generate 3 highlight bullets
    highlights = await generate_highlights_with_claude(stats, user_id, yesterday)

    await db.execute("""
      INSERT INTO daily_digests (user_id, digest_date, stats, highlights)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, digest_date) DO UPDATE
      SET stats = EXCLUDED.stats, highlights = EXCLUDED.highlights
    """, user_id, yesterday, stats, highlights)
```

### Claude prompt for highlights

```
You are the end-of-day analyst for a solo entrepreneur running a B2B AI agency.
Given yesterday's stats and the top 10 changes from the day before, generate exactly 3 bullets:
1. One WIN (type: 'up') — the single best thing that happened
2. One OPPORTUNITY (type: 'neutral') — a warm lead or pattern to act on today
3. One CONCERN (type: 'down') — something to pause, kill, or fix

Each bullet: max 20 words. Concrete, specific, no fluff. Mention names and numbers.
Return JSON only.
```

### API

- `GET /api/digests/latest` — returns yesterday's digest
- `POST /api/digests/settings` — configure delivery time + channels

### Frontend

`<DailyDigestCard />` — 4 stat tiles with colored numerals + 3 bullet list with up/down/neutral markers. Background uses a subtle gradient (`surface` → `brand-soft`) to differentiate from other cards.

---

## 4 · Activity Streak

### Purpose
30-day GitHub-style commit graph showing daily CRM activity level. Current streak counter. Psychological nudge to maintain consistency.

### Location
`/today` — middle column of 3-col row.

### Supabase

**New view:** `v_daily_activity`

```sql
CREATE OR REPLACE VIEW v_daily_activity AS
SELECT
  DATE(created_at) AS day,
  user_id,
  COUNT(*) AS touch_count,
  -- 0 = none, 1 = light (1-10), 2 = medium (11-30), 3 = heavy (31-60), 4 = intense (60+)
  CASE
    WHEN COUNT(*) = 0 THEN 0
    WHEN COUNT(*) <= 10 THEN 1
    WHEN COUNT(*) <= 30 THEN 2
    WHEN COUNT(*) <= 60 THEN 3
    ELSE 4
  END AS activity_level
FROM touchpoints
WHERE type IN ('email_sent','wa_sent','call_made','li_message','email_reply_sent')
GROUP BY DATE(created_at), user_id;
```

### API

`GET /api/activity/streak` — returns last 30 days + current streak length.

```json
{
  "current_streak": 23,
  "longest_streak": 31,
  "days": [
    {"date": "2026-03-21", "level": 2},
    {"date": "2026-03-22", "level": 3},
    ...
  ]
}
```

### Streak calculation

Current streak = count of consecutive days back from today (inclusive) where `activity_level > 0`.

### Frontend

`<StreakCard />` — Shows big number (current streak), legend, 30-cell grid. Each cell colored by level using `rgba(96, 165, 250, {0.25, 0.5, 0.75, 1.0})`. Skipped days = red-tinted.

---

## 5 · Winning Patterns

### Purpose
AI-detected combinations of factors that are outperforming. Tells you exactly what to do more of, with the multiplier vs. your average.

### Location
`/performance` — below segment breakdown, left column of 2-col row.

### Supabase

**New table:** `detected_patterns`

```sql
CREATE TABLE detected_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL,  -- 'winning' or 'losing'
  description text NOT NULL,
  segment_filters jsonb,  -- {industry, country, channel, send_window, subject_style}
  sample_size int NOT NULL,
  metric_name text NOT NULL,  -- 'reply_rate', 'meeting_rate', etc
  metric_value numeric NOT NULL,
  vs_avg_multiplier numeric NOT NULL,
  rank int NOT NULL,
  detected_at timestamptz DEFAULT NOW(),
  period_start date,
  period_end date
);
```

### Pattern detection job

Run nightly. For each combination of (industry × country × send day-of-week × send hour-bucket × subject-style), compute reply rate. Flag the top 3 that have:
- sample size ≥ 100
- reply rate ≥ 2× the overall average

```python
# Pseudocode
async def detect_winning_patterns():
    combos = await db.fetch("""
      SELECT
        l.country,
        l.industry,
        EXTRACT(DOW FROM t.sent_at) AS dow,
        EXTRACT(HOUR FROM t.sent_at) AS hour,
        classify_subject_style(t.subject) AS subject_style,
        COUNT(*) AS sent,
        COUNT(*) FILTER (WHERE t.replied_at IS NOT NULL) AS replies,
        COUNT(*) FILTER (WHERE t.replied_at IS NOT NULL)::float / COUNT(*) AS reply_rate
      FROM touchpoints t
      JOIN leads l ON t.lead_id = l.id
      WHERE t.type = 'email_sent' AND t.sent_at > NOW() - INTERVAL '30 days'
      GROUP BY 1, 2, 3, 4, 5
      HAVING COUNT(*) >= 100
    """)

    overall_rate = await db.fetchval("SELECT avg_reply_rate FROM v_overall_stats")

    # Rank top 3
    winners = [c for c in combos if c.reply_rate >= overall_rate * 2][:3]

    # Insert into detected_patterns
```

### API

`GET /api/patterns/winning` — returns top 3 current winning patterns.

### Frontend

`<WinningPatterns />` — 3 pattern cards, each with:
- Rank badge (#1 green, #2 blue, #3 purple)
- Pattern description (one sentence)
- Metric footer: 4 stats (reply rate, multiplier vs avg, sample size, meetings booked)

---

## 6 · Best Time Heatmap

### Purpose
7 days × 24 hours grid showing when REPLIES come in (not when you send). Tells you the right send window to maximize inbox visibility at reply-peak time.

### Location
`/performance` — below segment breakdown, right column.

### Supabase

**New view:** `v_reply_heatmap`

```sql
CREATE OR REPLACE VIEW v_reply_heatmap AS
SELECT
  EXTRACT(DOW FROM t.received_at AT TIME ZONE COALESCE(l.timezone, 'UTC'))::int AS day_of_week,
  EXTRACT(HOUR FROM t.received_at AT TIME ZONE COALESCE(l.timezone, 'UTC'))::int AS hour_of_day,
  COUNT(*) AS reply_count
FROM touchpoints t
JOIN leads l ON t.lead_id = l.id
WHERE t.type = 'email_reply'
  AND t.received_at > NOW() - INTERVAL '90 days'
GROUP BY 1, 2;
```

### API

`GET /api/heatmap/replies?days=90` — returns 168-cell heatmap data.

### Frontend

`<BestTimeHeatmap />` — 7 rows (Mon-Sun) × 24 columns (0-23). Cells shaded by reply volume. Peak cells get green background + "peak" class. Labels for peak and dead times shown below. Hover tooltip shows exact count.

**Intelligent callout computation:**
- Peak cells: top 3 cells by reply count, show as "Peak: Tue 10am, Thu 2pm, Wed 11am"
- Dead cells: bottom 3 cells with > 0 sends, show as "Dead: Fri 4pm, Mon 8am, Sat 10am"
- Recommendation: "Schedule sends 2h earlier than peak reply time"

---

## 7 · Subject Line Graveyard

### Purpose
Rank all subject lines (min 100 sends in 30 days) by open rate. Top 4 go in a "reuse" green block, bottom 5 go in a "kill" red block.

### Location
`/performance` — full-width card below the 2-col pattern/heatmap row.

### Supabase

**New view:** `v_subject_performance`

```sql
CREATE OR REPLACE VIEW v_subject_performance AS
SELECT
  t.subject_template AS subject,
  COUNT(*) AS sent,
  COUNT(*) FILTER (WHERE t.opened_at IS NOT NULL) AS opens,
  ROUND((COUNT(*) FILTER (WHERE t.opened_at IS NOT NULL))::numeric / COUNT(*) * 100, 1) AS open_rate,
  COUNT(*) FILTER (WHERE t.replied_at IS NOT NULL) AS replies,
  ROUND((COUNT(*) FILTER (WHERE t.replied_at IS NOT NULL))::numeric / COUNT(*) * 100, 2) AS reply_rate
FROM touchpoints t
WHERE t.type = 'email_sent'
  AND t.sent_at > NOW() - INTERVAL '30 days'
  AND t.subject_template IS NOT NULL
GROUP BY t.subject_template
HAVING COUNT(*) >= 100
ORDER BY open_rate DESC;
```

### API

- `GET /api/subjects/top?limit=4` — top performers
- `GET /api/subjects/bottom?limit=5` — worst performers
- `POST /api/subjects/{id}/archive` — mark as killed (won't be reused in auto-campaigns)

### Frontend

`<SubjectGraveyard />` — two stacked sections:
1. Green banner "TOP 4 — reuse these in new campaigns" + 4 rows
2. Red banner "BOTTOM 5 — archive these, don't reuse" + 5 rows

Each row: rank, subject text (monospace), sends count, open rate, action button (Reuse/Kill).

---

## 8 · Lead Leakage Report

### Purpose
Deals dying from neglect, not rejection. Surfaces 5 categories of leaks with counts and bulk action buttons.

### Location
`/pipeline` — below the weighted pipeline summary.

### Supabase

**No new table.** All alerts are derived from existing `leads`, `touchpoints`, `meetings`, `deals` tables.

**View:** `v_lead_leakage_alerts`

```sql
CREATE OR REPLACE VIEW v_lead_leakage_alerts AS
SELECT
  'stuck_followup2' AS alert_type,
  'Leads stuck in Follow-up 2 for 14+ days' AS title,
  COUNT(*)::int AS count,
  SUM(weighted_value)::numeric AS total_value
FROM leads l
LEFT JOIN deals d ON d.lead_id = l.id AND d.status = 'open'
WHERE l.stage = 'Follow-up 2'
  AND NOT EXISTS (
    SELECT 1 FROM touchpoints t
    WHERE t.lead_id = l.id AND t.created_at > NOW() - INTERVAL '14 days'
  )

UNION ALL

SELECT
  'missing_post_meeting_followup',
  'Meetings ended · no follow-up email sent',
  COUNT(*)::int,
  NULL
FROM meetings m
WHERE m.ended_at > NOW() - INTERVAL '7 days'
  AND m.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM touchpoints t
    WHERE t.lead_id = m.lead_id
      AND t.type = 'email_sent'
      AND t.sent_at > m.ended_at
  )

UNION ALL

SELECT
  'unanswered_positive_replies',
  'Positive replies · not responded to in 24h',
  COUNT(*)::int,
  NULL
FROM touchpoints t
WHERE t.type = 'email_reply'
  AND t.sentiment_score > 0.3
  AND t.received_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM touchpoints t2
    WHERE t2.lead_id = t.lead_id
      AND t2.type = 'email_sent'
      AND t2.sent_at > t.received_at
  )

UNION ALL

SELECT
  'ghosted',
  'Ghosted leads — replied once, then silence 7+ days',
  COUNT(*)::int,
  NULL
FROM leads l
WHERE EXISTS (
    SELECT 1 FROM touchpoints t
    WHERE t.lead_id = l.id AND t.type = 'email_reply'
      AND t.received_at < NOW() - INTERVAL '7 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM touchpoints t
    WHERE t.lead_id = l.id AND t.type = 'email_reply'
      AND t.received_at > NOW() - INTERVAL '7 days'
  )

UNION ALL

SELECT
  'stale_proposals',
  'Proposals sent > 7 days ago · no follow-up',
  COUNT(*)::int,
  SUM(d.amount)::numeric
FROM deals d
JOIN touchpoints t ON t.lead_id = d.lead_id AND t.type = 'proposal_sent'
WHERE d.status = 'open'
  AND t.sent_at < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM touchpoints t2
    WHERE t2.lead_id = d.lead_id
      AND t2.sent_at > t.sent_at
  );
```

### API

- `GET /api/leakage/alerts` — list of alert rows
- `GET /api/leakage/alerts/{type}/leads` — full list of affected leads for that alert
- `POST /api/leakage/alerts/{type}/bulk-action` — apply bulk nudge/draft/chase

### Frontend

`<LeakageReport />` — 5 alert rows, color-coded by severity (red for revenue at risk, amber for missed follow-ups). Each row has a one-click "bulk action" button that opens a confirmation modal showing the affected leads.

---

## 9 · Objection Handler Library

### Purpose
Proven replies to common pushbacks. Learns from every closed deal. Shown as a library panel on the Unified Inbox; tap a card to insert into draft.

### Location
`/inbox` — below the thread pane, full width.

### Supabase

**New table:** `objection_handlers`

```sql
CREATE TABLE objection_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_type text NOT NULL,  -- 'price', 'timing', 'decision', 'competitor', 'diy', 'trust', 'complexity', 'hard_no'
  objection_quote text NOT NULL,
  reply_template text NOT NULL,
  times_used int DEFAULT 0,
  times_recovered int DEFAULT 0,  -- lead replied positively after
  recovery_rate numeric GENERATED ALWAYS AS (
    CASE WHEN times_used > 0 THEN times_recovered::numeric / times_used ELSE 0 END
  ) STORED,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Seed data for 8 starting templates
INSERT INTO objection_handlers (objection_type, objection_quote, reply_template, times_used, times_recovered) VALUES
  ('price', 'That''s more than we budgeted — can you come down on price?',
   'Totally fair. The €1,200/mo is actually our 1-location plan. Most clinics we work with start there, see the booking lift in 30 days, and roll out to other locations once the ROI is obvious. Want me to send a 60-day pilot quote instead?',
   14, 9),
  ('timing', 'Bad timing right now, circle back in Q3?',
   'Makes sense. Quick thought though — Q3 is exactly when {clinic} gets the summer rush, so if we set up now, you''d go into peak season with intake handled. Worth a 15-min look before I put you on the calendar for August?',
   22, 11),
  -- ... (6 more seeded templates — see full HTML prototype for all 8)
;
```

### AI auto-classification

When a reply comes in, classify its objection type:

```python
async def classify_objection(reply_text: str) -> str:
    # Use Claude haiku for speed
    response = await claude_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{
            "role": "user",
            "content": f"""Classify this sales email reply into ONE category:
- price: budget/cost concerns
- timing: not now, later
- decision: needs to check with someone
- competitor: using someone else
- diy: will build in-house
- trust: needs proof/validation
- complexity: too complicated to adopt
- hard_no: outright rejection
- none: not an objection

Reply: {reply_text}

Category:"""
        }]
    )
    return response.content[0].text.strip().lower()
```

### API

- `GET /api/objections` — list all templates sorted by recovery rate
- `GET /api/objections/classify?text=...` — classify a reply, return matching template
- `POST /api/objections/{id}/track` — increment `times_used`
- `POST /api/objections/{id}/recovery` — increment `times_recovered` (called when the lead replies positively again within 7 days)

### Frontend

`<ObjectionLibrary />` — grid of 8+ cards, each showing:
- Objection type badge (amber)
- Usage stat ("used 14× · 64% recovered")
- Objection quote in italic
- Reply template
- Recovery rate highlighted in green

Clicking a card inserts the reply into the active thread's reply composer (if a thread is open).

**Smart surfacing:** When a thread has a classified objection, the matching card auto-highlights and is shown first.

---

## Implementation order

Build in this order for fastest "feels different" payoff:

1. **Goals Progress** (2 hours) — simplest, instant morale boost
2. **Activity Streak** (2 hours) — same table shape, pure visual
3. **Daily Digest** (4 hours) — cron + claude prompt, delivers value every evening
4. **Champion Leads** (4 hours) — the core "what to do right now" signal
5. **Lead Leakage Report** (4 hours) — reuses existing tables, pure SQL view
6. **Subject Line Graveyard** (2 hours) — simple SQL view + list
7. **Winning Patterns** (6 hours) — requires the classification job; start with manual patterns
8. **Best Time Heatmap** (3 hours) — straightforward SQL + heatmap render
9. **Objection Handler Library** (4 hours) — seed the 8 templates first, AI classification later

**Total estimated effort:** ~31 hours over 5-7 focused build days.

---

## Testing checklist

- [ ] Each component renders in both dark AND light theme without style bugs
- [ ] Each component collapses cleanly to mobile (test at 375px, 768px, 980px)
- [ ] Each SQL view runs in <500ms on your production data
- [ ] Each API endpoint returns in <200ms (cache aggressively)
- [ ] No existing features or views were modified or broken
- [ ] All text is copy-edited (no placeholder text left over)
- [ ] Theme toggle persists via localStorage
- [ ] Empty states are designed (what if there are zero champions, zero patterns, etc.)

---

## Handoff notes

- Copy is written in Komal's voice: direct, specific, slightly warm, numeric where possible
- All monetary examples use €, not $ (Alainza Bizz targets EU + India)
- All times are local to the lead, not the user (reply heatmap especially)
- The AI-generated content (digest highlights, objection classifications) must always be cheap fast models (Haiku), not Opus — this runs in the background every day
