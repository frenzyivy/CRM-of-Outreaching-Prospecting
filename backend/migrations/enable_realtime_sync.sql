-- Enable Supabase Realtime replication for tables watched by useRealtimeSync
-- on web ([frontend/src/contexts/RealtimeSyncContext.tsx]) and mobile
-- ([mobile/src/hooks/useRealtimeSync.ts]).
--
-- Run this once in the Supabase SQL editor. Idempotent — safe to re-run.
-- If a table does not exist yet, create it first, then add it to the publication.

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
    'expenses'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION WHEN duplicate_object THEN
        -- already in publication
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- Verify:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
