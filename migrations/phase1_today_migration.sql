-- ============================================================================
-- Phase 1 — Today page migration
-- ============================================================================
-- Safe to run multiple times (idempotent via IF NOT EXISTS / CREATE OR REPLACE).
-- Adds:
--   1. leads.intent_score (nullable numeric, populated by nightly job)
--   2. goals table + v_goal_progress view
--   3. daily_digests table
--   4. v_touchpoints — compatibility view over activities + email_open_events
--      + whatsapp_messages, with NULL for fields we don't yet track
--   5. v_daily_activity — 30-day activity grid
--   6. v_champion_leads — top intent leads
-- Does NOT touch any existing table schema or existing view.
-- ============================================================================


-- 1. leads.intent_score ------------------------------------------------------

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intent_score NUMERIC;

COMMENT ON COLUMN leads.intent_score IS
  'Nullable 0-100 score, populated nightly by champion-leads job. NULL = not yet scored.';


-- 2. goals -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('mrr', 'meetings_booked', 'replies_received', 'outreach_volume')),
  target_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_unique
  ON goals(user_id, period_type, period_start, metric);


-- 3. daily_digests -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  digest_date DATE NOT NULL,
  stats JSONB NOT NULL,
  highlights JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_via TEXT[],
  UNIQUE(user_id, digest_date)
);


-- 4. v_touchpoints -----------------------------------------------------------
-- Compatibility view. Maps existing tables to the spec's touchpoints shape.
-- Existing enum values in activities.activity_type:
--   email, call, note, stage_change, email_open, email_reply (observed)
-- Spec expects:
--   email_sent, email_reply, wa_sent, call_made, li_message, email_open,
--   link_click, proposal_view, proposal_sent
-- Mapping is additive — we do NOT alter the underlying enum.
-- Fields we don't yet capture (sentiment_score, subject_template, replied_at,
-- opened_at) are emitted as NULL so dependent features degrade gracefully.

CREATE OR REPLACE VIEW v_touchpoints AS
SELECT
  a.id,
  a.lead_id,
  CASE a.activity_type
    WHEN 'email' THEN 'email_sent'
    WHEN 'call'  THEN 'call_made'
    ELSE a.activity_type
  END AS type,
  a.created_at,
  a.created_at        AS sent_at,
  NULL::TIMESTAMPTZ   AS received_at,
  NULL::TIMESTAMPTZ   AS replied_at,
  NULL::TIMESTAMPTZ   AS opened_at,
  NULL::TEXT          AS subject_template,
  NULL::TEXT          AS subject,
  NULL::NUMERIC       AS sentiment_score,
  a.description
FROM activities a

UNION ALL

SELECT
  e.id,
  (SELECT l.id FROM leads l WHERE LOWER(l.email) = LOWER(e.lead_email) LIMIT 1) AS lead_id,
  'email_open' AS type,
  e.opened_at  AS created_at,
  NULL::TIMESTAMPTZ AS sent_at,
  e.opened_at  AS received_at,
  NULL::TIMESTAMPTZ AS replied_at,
  e.opened_at  AS opened_at,
  e.subject_line AS subject_template,
  e.subject_line AS subject,
  NULL::NUMERIC AS sentiment_score,
  NULL::TEXT    AS description
FROM email_open_events e

UNION ALL

SELECT
  w.id,
  w.lead_id,
  CASE WHEN w.direction = 'outbound' THEN 'wa_sent' ELSE 'wa_received' END AS type,
  w.created_at,
  CASE WHEN w.direction = 'outbound' THEN w.created_at END AS sent_at,
  CASE WHEN w.direction = 'inbound'  THEN w.created_at END AS received_at,
  NULL::TIMESTAMPTZ AS replied_at,
  NULL::TIMESTAMPTZ AS opened_at,
  NULL::TEXT        AS subject_template,
  NULL::TEXT        AS subject,
  NULL::NUMERIC     AS sentiment_score,
  w.content         AS description
FROM whatsapp_messages w;


-- 5. v_daily_activity --------------------------------------------------------
-- One row per day, level 0-4 based on touch count.

CREATE OR REPLACE VIEW v_daily_activity AS
SELECT
  DATE(created_at) AS day,
  COUNT(*)         AS touch_count,
  CASE
    WHEN COUNT(*) = 0  THEN 0
    WHEN COUNT(*) <= 10 THEN 1
    WHEN COUNT(*) <= 30 THEN 2
    WHEN COUNT(*) <= 60 THEN 3
    ELSE 4
  END AS activity_level
FROM v_touchpoints
WHERE type IN ('email_sent', 'wa_sent', 'call_made', 'li_message', 'email_reply', 'note')
GROUP BY DATE(created_at);


-- 6. v_goal_progress ---------------------------------------------------------
-- Computes current progress for each active goal row.

CREATE OR REPLACE VIEW v_goal_progress AS
SELECT
  g.id,
  g.user_id,
  g.metric,
  g.target_value,
  g.period_start,
  g.period_end,
  CASE g.metric
    WHEN 'mrr' THEN
      (SELECT COALESCE(SUM(monthly_amount), 0)::NUMERIC
       FROM deals
       WHERE status = 'active' AND started_at <= g.period_end)
    WHEN 'meetings_booked' THEN
      (SELECT COUNT(*)::NUMERIC
       FROM meetings
       WHERE booked_at BETWEEN g.period_start AND g.period_end)
    WHEN 'replies_received' THEN
      (SELECT COUNT(*)::NUMERIC
       FROM v_touchpoints
       WHERE type = 'email_reply'
         AND created_at BETWEEN g.period_start AND g.period_end)
    WHEN 'outreach_volume' THEN
      (SELECT COUNT(*)::NUMERIC
       FROM v_touchpoints
       WHERE type IN ('email_sent', 'wa_sent', 'call_made', 'li_message')
         AND created_at BETWEEN g.period_start AND g.period_end)
  END AS current_value,
  EXTRACT(DAY FROM g.period_end - CURRENT_DATE)::INT   AS days_remaining,
  EXTRACT(DAY FROM CURRENT_DATE - g.period_start)::INT AS days_elapsed,
  EXTRACT(DAY FROM g.period_end - g.period_start)::INT AS days_total
FROM goals g
WHERE CURRENT_DATE BETWEEN g.period_start AND g.period_end;

-- NOTE: v_goal_progress references `deals` and `meetings` tables which will be
-- created in Phase 2/5. Until those exist, the mrr / meetings_booked branches
-- will fail. To keep this view installable NOW, wrap those references:

CREATE OR REPLACE VIEW v_goal_progress AS
SELECT
  g.id,
  g.user_id,
  g.metric,
  g.target_value,
  g.period_start,
  g.period_end,
  CASE g.metric
    WHEN 'mrr'              THEN 0::NUMERIC
    WHEN 'meetings_booked'  THEN 0::NUMERIC
    WHEN 'replies_received' THEN
      (SELECT COUNT(*)::NUMERIC FROM v_touchpoints
       WHERE type = 'email_reply'
         AND created_at BETWEEN g.period_start AND g.period_end)
    WHEN 'outreach_volume'  THEN
      (SELECT COUNT(*)::NUMERIC FROM v_touchpoints
       WHERE type IN ('email_sent','wa_sent','call_made','li_message')
         AND created_at BETWEEN g.period_start AND g.period_end)
  END AS current_value,
  EXTRACT(DAY FROM g.period_end - CURRENT_DATE)::INT   AS days_remaining,
  EXTRACT(DAY FROM CURRENT_DATE - g.period_start)::INT AS days_elapsed,
  EXTRACT(DAY FROM g.period_end - g.period_start)::INT AS days_total
FROM goals g
WHERE CURRENT_DATE BETWEEN g.period_start AND g.period_end;


-- 7. v_champion_leads --------------------------------------------------------
-- Ranks leads by intent_score (populated nightly). Until scoring job runs,
-- intent_score is NULL and this view returns zero rows — empty state on UI.

CREATE OR REPLACE VIEW v_champion_leads AS
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.full_name,
  l.email,
  l.company_name,
  ls.stage,
  l.country,
  COALESCE(l.intent_score, 0)::INT AS intent_score,
  l.email_opens,
  l.email_replies,
  l.email_clicks,
  l.last_email_event,
  l.last_email_event_at,
  EXTRACT(DAY FROM NOW() - COALESCE(
    (SELECT MAX(created_at) FROM v_touchpoints t WHERE t.lead_id = l.id),
    l.updated_at
  ))::INT AS days_since_touch
FROM leads l
LEFT JOIN lead_stages ls ON ls.lead_id = l.id
WHERE COALESCE(ls.stage, 'new') NOT IN ('closed_won', 'closed_lost')
  AND l.intent_score IS NOT NULL
  AND l.intent_score >= 60
ORDER BY l.intent_score DESC
LIMIT 20;


-- ============================================================================
-- Done. Verify with:
--   SELECT * FROM v_touchpoints LIMIT 5;
--   SELECT * FROM v_daily_activity ORDER BY day DESC LIMIT 30;
--   SELECT * FROM v_champion_leads;
--   SELECT * FROM v_goal_progress;
-- ============================================================================
