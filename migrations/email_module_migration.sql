-- =============================================================
-- Email Module Migration
-- AI Medical CRM — Multi-Channel Email Analytics & Inbox Management
--
-- Run this in your Supabase SQL editor.
-- Creates 4 new tables. Safe to run on a fresh project.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. email_accounts
--    Master list of all sending inboxes.
--    The user sets global_daily_limit here — this is the single
--    source of truth for how many emails that inbox may send per
--    day across ALL platforms combined.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_accounts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL UNIQUE,
  global_daily_limit INTEGER    NOT NULL DEFAULT 100,
  warmup_score      INTEGER,                        -- nullable: not all platforms report this
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_email_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER trg_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_email_accounts_updated_at();

-- ---------------------------------------------------------------
-- 2. platform_connections
--    Maps which platforms each inbox is connected to, and how
--    much of the global daily limit is allocated to each platform.
--
--    Validation rule (enforced in application layer, not DB):
--    SUM(allocated_daily_limit) per email_account_id should not
--    exceed email_accounts.global_daily_limit. The UI shows a
--    warning but does not hard-block (user may over-allocate
--    intentionally during testing).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_connections (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id    UUID    NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  platform            TEXT    NOT NULL CHECK (platform IN ('instantly', 'convertkit', 'lemlist', 'smartlead')),
  allocated_daily_limit INTEGER NOT NULL DEFAULT 0,
  platform_account_id TEXT,                         -- the ID this account has on the external platform
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(email_account_id, platform)
);

-- ---------------------------------------------------------------
-- 3. email_sync_snapshots
--    One row per (email_account × platform × calendar day).
--    Written by the 15-minute sync service (upsert on conflict).
--    Stores raw numbers fetched from each platform's API.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_sync_snapshots (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID    NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  platform         TEXT    NOT NULL,
  sync_date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  synced_at        TIMESTAMPTZ DEFAULT now(),

  -- Sending volume
  sent             INTEGER NOT NULL DEFAULT 0,

  -- Engagement (fetched from platform API)
  opened           INTEGER NOT NULL DEFAULT 0,
  clicked          INTEGER NOT NULL DEFAULT 0,
  replied          INTEGER NOT NULL DEFAULT 0,
  bounced          INTEGER NOT NULL DEFAULT 0,
  unsubscribed     INTEGER NOT NULL DEFAULT 0,

  -- Upsert key: one row per account+platform+day (latest sync overwrites)
  UNIQUE(email_account_id, platform, sync_date)
);

-- ---------------------------------------------------------------
-- 4. email_analytics_daily
--    Pre-computed daily aggregates per email account, combined
--    across all connected platforms. Rebuilt after every sync.
--
--    All rates are weighted averages:
--      open_rate = (total_opened / total_sent) × 100
--    Never AVG(open_rate) across accounts — that is wrong when
--    accounts have different send volumes.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_analytics_daily (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID    NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  analytics_date   DATE    NOT NULL DEFAULT CURRENT_DATE,

  -- Combined totals across all platforms for this inbox
  total_sent         INTEGER NOT NULL DEFAULT 0,
  total_opened       INTEGER NOT NULL DEFAULT 0,
  total_clicked      INTEGER NOT NULL DEFAULT 0,
  total_replied      INTEGER NOT NULL DEFAULT 0,
  total_bounced      INTEGER NOT NULL DEFAULT 0,
  total_unsubscribed INTEGER NOT NULL DEFAULT 0,

  -- Weighted rates (stored as percentage, e.g. 18.50 = 18.5%)
  open_rate   NUMERIC(5,2),
  click_rate  NUMERIC(5,2),
  reply_rate  NUMERIC(5,2),
  bounce_rate NUMERIC(5,2),
  unsub_rate  NUMERIC(5,2),

  -- Capacity snapshot at time of computation
  global_limit     INTEGER,   -- copied from email_accounts.global_daily_limit
  total_allocated  INTEGER,   -- sum of platform_connections.allocated_daily_limit
  remaining        INTEGER,   -- global_limit - total_sent

  computed_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(email_account_id, analytics_date)
);

-- ---------------------------------------------------------------
-- Row Level Security
-- Enable RLS on all new tables (deny by default, service role bypasses)
-- ---------------------------------------------------------------
ALTER TABLE email_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics_daily  ENABLE ROW LEVEL SECURITY;

-- Allow full access via service role (used by backend)
-- Authenticated users can read their own data
-- Adjust these policies to match your auth model as needed.

CREATE POLICY "service_role_all_email_accounts"
  ON email_accounts FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_platform_connections"
  ON platform_connections FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_email_sync_snapshots"
  ON email_sync_snapshots FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_email_analytics_daily"
  ON email_analytics_daily FOR ALL
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- Indexes for common query patterns
-- ---------------------------------------------------------------

-- Look up accounts by email address (used by sync service)
CREATE INDEX IF NOT EXISTS idx_email_accounts_email
  ON email_accounts(email);

-- Fetch all connections for a given account
CREATE INDEX IF NOT EXISTS idx_platform_connections_account
  ON platform_connections(email_account_id);

-- Fetch today's snapshots quickly (most common query)
CREATE INDEX IF NOT EXISTS idx_email_sync_snapshots_date
  ON email_sync_snapshots(sync_date);

CREATE INDEX IF NOT EXISTS idx_email_sync_snapshots_account_date
  ON email_sync_snapshots(email_account_id, sync_date);

-- Fetch today's analytics quickly
CREATE INDEX IF NOT EXISTS idx_email_analytics_daily_date
  ON email_analytics_daily(analytics_date);

CREATE INDEX IF NOT EXISTS idx_email_analytics_daily_account_date
  ON email_analytics_daily(email_account_id, analytics_date);

-- =============================================================
-- Done. 4 tables created:
--   email_accounts
--   platform_connections
--   email_sync_snapshots
--   email_analytics_daily
-- =============================================================
