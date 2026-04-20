-- =============================================================================
-- Web ↔ Android sync + FCM push notifications — Supabase migration
-- =============================================================================
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → paste
-- → Run). Idempotent: safe to re-run if partially applied.
--
-- This migration does three things:
--   1. Creates the `user_devices` table for FCM token storage.
--   2. Adds RLS policies so each user only sees their own devices.
--   3. Adds every table watched by useRealtimeSync (web + mobile) to the
--      `supabase_realtime` publication so postgres_changes events fire.
--
-- Supersedes: enable_realtime_sync.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. user_devices — stores FCM registration tokens per user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token   text NOT NULL,
  platform    text NOT NULL DEFAULT 'android'
              CHECK (platform IN ('android', 'ios', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fcm_token ON public.user_devices(fcm_token);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION public.user_devices_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_devices_updated_at ON public.user_devices;
CREATE TRIGGER trg_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.user_devices_touch_updated_at();


-- -----------------------------------------------------------------------------
-- 2. RLS on user_devices — each user can only read/write their own rows.
--    The backend uses the service key and bypasses RLS, which is correct.
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_devices_select_own"  ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_insert_own"  ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_update_own"  ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_delete_own"  ON public.user_devices;

CREATE POLICY "user_devices_select_own" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_devices_insert_own" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_devices_update_own" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_devices_delete_own" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 3. Enable Realtime on every table watched by the sync hook.
--    See: frontend/src/contexts/RealtimeSyncContext.tsx
--         mobile/src/hooks/useRealtimeSync.ts
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads',
    'activities',
    'companies',
    'notifications',
    'email_accounts',
    'platform_connections',
    'revenue_entries',
    'expenses',
    'user_devices'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION WHEN duplicate_object THEN
        NULL;  -- already in publication, skip
      END;
    END IF;
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- Verification queries (run these after to confirm everything applied)
-- -----------------------------------------------------------------------------
-- SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' ORDER BY tablename;
--
-- SELECT COUNT(*) AS device_rows FROM public.user_devices;
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'user_devices';
