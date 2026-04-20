-- ============================================================
-- Open Intelligence Migration
-- AI Medical CRM — Email Open Intelligence Module
-- Safe to re-run (IF NOT EXISTS + OR REPLACE)
-- ============================================================

-- Table 1: email_template_tags
-- Stores manually assigned body-angle tags per campaign step+variant
CREATE TABLE IF NOT EXISTS email_template_tags (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  TEXT        NOT NULL,
    step_number  INT         NOT NULL,
    variant_id   TEXT        NOT NULL DEFAULT 'A',
    subject_line TEXT,
    body_preview TEXT,
    body_angle   TEXT        NOT NULL DEFAULT 'untagged',
    tagged_by    TEXT,
    tagged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, step_number, variant_id)
);

ALTER TABLE email_template_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_template_tags'
        AND policyname = 'service_role_all_email_template_tags'
    ) THEN
        CREATE POLICY "service_role_all_email_template_tags"
            ON email_template_tags FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Table 2: email_open_events
-- Granular per-open event rows, written by webhook handler + poll supplement
CREATE TABLE IF NOT EXISTS email_open_events (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_email           TEXT        NOT NULL,
    campaign_id          TEXT        NOT NULL,
    campaign_name        TEXT,
    step_number          INT         NOT NULL DEFAULT 1,
    variant_id           TEXT        NOT NULL DEFAULT 'A',
    subject_line         TEXT,
    opened_at            TIMESTAMPTZ NOT NULL,
    opened_at_lead_local TIMESTAMPTZ,           -- Converted to lead's local timezone at write time
    open_number          INT         NOT NULL DEFAULT 1,  -- nth open by this lead for this email
    lead_country         TEXT,
    lead_specialty       TEXT,
    lead_timezone        TEXT,
    device_type          TEXT        NOT NULL DEFAULT 'unknown',  -- 'mobile','desktop','unknown','polled'
    raw_event_data       JSONB,
    synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lead_email, campaign_id, step_number, variant_id, opened_at)
);

CREATE INDEX IF NOT EXISTS idx_open_events_time
    ON email_open_events (opened_at_lead_local);
CREATE INDEX IF NOT EXISTS idx_open_events_country
    ON email_open_events (lead_country);
CREATE INDEX IF NOT EXISTS idx_open_events_campaign
    ON email_open_events (campaign_id, step_number);
CREATE INDEX IF NOT EXISTS idx_open_events_email
    ON email_open_events (lead_email);

ALTER TABLE email_open_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_open_events'
        AND policyname = 'service_role_all_email_open_events'
    ) THEN
        CREATE POLICY "service_role_all_email_open_events"
            ON email_open_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Reference View 1: subject_line_performance
-- Joins open events with body-angle tags for subject-line leaderboard queries.
-- NOTE: endpoints use Python-side aggregation with filters; this view is for
-- ad-hoc Supabase Studio queries only.
CREATE OR REPLACE VIEW subject_line_performance AS
SELECT
    e.campaign_id,
    e.campaign_name,
    e.step_number,
    e.variant_id,
    e.subject_line,
    COALESCE(t.body_angle, 'untagged') AS body_angle,
    COALESCE(t.body_preview, '')       AS body_preview,
    COUNT(DISTINCT e.lead_email)       AS unique_opens,
    COUNT(*)                           AS total_opens,
    MIN(e.opened_at)                   AS first_open,
    MAX(e.opened_at)                   AS last_open
FROM email_open_events e
LEFT JOIN email_template_tags t
    ON  t.campaign_id  = e.campaign_id
    AND t.step_number  = e.step_number
    AND t.variant_id   = e.variant_id
GROUP BY
    e.campaign_id, e.campaign_name, e.step_number,
    e.variant_id, e.subject_line,
    t.body_angle, t.body_preview;

-- Reference View 2: open_time_heatmap
-- 7×24 grid of open counts using lead-local timestamps.
-- NOTE: endpoints filter by country/specialty in Python over base table.
CREATE OR REPLACE VIEW open_time_heatmap AS
SELECT
    EXTRACT(DOW  FROM opened_at_lead_local)::INT AS day_of_week,   -- 0=Sun, 6=Sat
    EXTRACT(HOUR FROM opened_at_lead_local)::INT AS hour_of_day,   -- 0-23
    lead_country,
    lead_specialty,
    COUNT(*)                                     AS open_count,
    COUNT(DISTINCT lead_email)                   AS unique_leads
FROM email_open_events
WHERE opened_at_lead_local IS NOT NULL
GROUP BY day_of_week, hour_of_day, lead_country, lead_specialty;
