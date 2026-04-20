-- ============================================================================
-- Phase 2 — Pipeline + Lead Leakage Report
-- ============================================================================
-- Safe to run multiple times (idempotent via CREATE OR REPLACE).
-- Adds:
--   1. v_lead_leakage_alerts — 5 categories of lead leakage, computed from
--      existing leads + lead_stages + v_touchpoints. No new tables.
--   2. v_pipeline_summary — single-row view: lead counts, cold-pool count,
--      close rate. Deal-value metrics (weighted pipeline, avg deal value)
--      are emitted as NULL — the API computes a placeholder until the
--      `deals` table arrives in Phase 5.
-- ============================================================================


-- 1. v_lead_leakage_alerts --------------------------------------------------
-- Categories adapted to current schema:
--   stuck_followup2        — leads in follow_up_1/2 with no touch in 14 days
--   no_post_meeting_followup — leads whose stage is "meeting" but no
--                              email/call activity logged after stage-change
--   unanswered_positive_replies — leads with stage = "responded" but no
--                                  outbound touch in 24h
--   ghosted                — leads with last activity > 7 days ago and stage
--                            in email_sent / follow_up_1 / follow_up_2
--   stale_proposals        — leads in proposal stage with no touch > 7 days
-- Fields:
--   alert_type (text), title (text), count (int), total_value (numeric|NULL)

CREATE OR REPLACE VIEW v_lead_leakage_alerts AS
WITH last_touch AS (
  SELECT
    lead_id,
    MAX(created_at) AS last_at
  FROM v_touchpoints
  WHERE lead_id IS NOT NULL
  GROUP BY lead_id
),
last_outbound AS (
  SELECT
    lead_id,
    MAX(created_at) AS last_at
  FROM v_touchpoints
  WHERE lead_id IS NOT NULL
    AND type IN ('email_sent', 'wa_sent', 'call_made', 'li_message')
  GROUP BY lead_id
),
leads_with_stage AS (
  SELECT
    l.id,
    COALESCE(ls.stage, 'new') AS stage,
    ls.updated_at AS stage_changed_at,
    lt.last_at   AS last_touch_at,
    lo.last_at   AS last_outbound_at
  FROM leads l
  LEFT JOIN lead_stages ls ON ls.lead_id = l.id
  LEFT JOIN last_touch   lt ON lt.lead_id = l.id
  LEFT JOIN last_outbound lo ON lo.lead_id = l.id
)

SELECT
  'stuck_followup2'::TEXT AS alert_type,
  'Leads stuck in Follow-up · 14+ days silent'::TEXT AS title,
  COUNT(*)::INT AS count,
  NULL::NUMERIC AS total_value,
  1 AS sort_order
FROM leads_with_stage
WHERE stage IN ('follow_up_1', 'follow_up_2')
  AND (last_touch_at IS NULL OR last_touch_at < NOW() - INTERVAL '14 days')

UNION ALL

SELECT
  'no_post_meeting_followup'::TEXT,
  'Meetings · no follow-up touch logged'::TEXT,
  COUNT(*)::INT,
  NULL::NUMERIC,
  2
FROM leads_with_stage
WHERE stage = 'meeting'
  AND (
    last_outbound_at IS NULL
    OR (stage_changed_at IS NOT NULL AND last_outbound_at < stage_changed_at)
  )

UNION ALL

SELECT
  'unanswered_positive_replies'::TEXT,
  'Responded · no reply from you in 24h'::TEXT,
  COUNT(*)::INT,
  NULL::NUMERIC,
  3
FROM leads_with_stage
WHERE stage = 'responded'
  AND (
    last_outbound_at IS NULL
    OR last_outbound_at < NOW() - INTERVAL '24 hours'
  )

UNION ALL

SELECT
  'ghosted'::TEXT,
  'Ghosted · no activity 7+ days'::TEXT,
  COUNT(*)::INT,
  NULL::NUMERIC,
  4
FROM leads_with_stage
WHERE stage IN ('email_sent', 'follow_up_1', 'follow_up_2')
  AND (last_touch_at IS NOT NULL AND last_touch_at < NOW() - INTERVAL '7 days')

UNION ALL

SELECT
  'stale_proposals'::TEXT,
  'Proposals · no follow-up > 7 days'::TEXT,
  COUNT(*)::INT,
  NULL::NUMERIC,  -- will show dollar value once deals table lands (Phase 5)
  5
FROM leads_with_stage
WHERE stage = 'proposal'
  AND (last_touch_at IS NULL OR last_touch_at < NOW() - INTERVAL '7 days')

ORDER BY sort_order;


-- 2. v_pipeline_summary -----------------------------------------------------
-- Single-row summary for the strip below the board.
-- weighted_pipeline_value / avg_deal_value are NULL here — API wraps them
-- with a placeholder computation from AVG_DEAL_SIZE_EUR env var.

CREATE OR REPLACE VIEW v_pipeline_summary AS
WITH stage_counts AS (
  SELECT
    COALESCE(ls.stage, 'new') AS stage,
    COUNT(*)::INT AS n
  FROM leads l
  LEFT JOIN lead_stages ls ON ls.lead_id = l.id
  GROUP BY COALESCE(ls.stage, 'new')
),
totals AS (
  SELECT
    SUM(n) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost'))::INT AS open_leads,
    SUM(n) FILTER (WHERE stage IN ('closed_won'))::INT AS won_leads,
    SUM(n) FILTER (WHERE stage IN ('closed_won', 'closed_lost'))::INT AS closed_leads,
    SUM(n) FILTER (WHERE stage IN ('new', 'researched'))::INT AS cold_pool
  FROM stage_counts
),
stuck AS (
  SELECT COUNT(*)::INT AS n
  FROM leads l
  LEFT JOIN lead_stages ls ON ls.lead_id = l.id
  LEFT JOIN (
    SELECT lead_id, MAX(created_at) AS last_at FROM v_touchpoints GROUP BY lead_id
  ) lt ON lt.lead_id = l.id
  WHERE COALESCE(ls.stage, 'new') NOT IN ('closed_won', 'closed_lost')
    AND (lt.last_at IS NULL OR lt.last_at < NOW() - INTERVAL '14 days')
)

SELECT
  t.open_leads,
  t.won_leads,
  t.closed_leads,
  t.cold_pool,
  s.n AS stuck_leads,
  CASE WHEN t.closed_leads > 0
    THEN ROUND((t.won_leads::NUMERIC / t.closed_leads) * 100, 1)
    ELSE 0::NUMERIC
  END AS close_rate_pct,
  NULL::NUMERIC AS weighted_pipeline_value,
  NULL::NUMERIC AS avg_deal_value
FROM totals t
CROSS JOIN stuck s;


-- ============================================================================
-- Verify with:
--   SELECT * FROM v_lead_leakage_alerts;
--   SELECT * FROM v_pipeline_summary;
-- ============================================================================
