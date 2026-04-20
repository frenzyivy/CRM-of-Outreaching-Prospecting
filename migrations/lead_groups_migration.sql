-- ============================================================
-- Lead Groups Migration
-- Run in Supabase SQL editor to enable AI assistant groups
-- ============================================================

-- 1. lead_groups — stores named groups created by the AI assistant
CREATE TABLE IF NOT EXISTS lead_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. lead_group_members — many-to-many: group ↔ lead (by lead id)
CREATE TABLE IF NOT EXISTS lead_group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES lead_groups(id) ON DELETE CASCADE,
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_group_members_group ON lead_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_lead_group_members_lead  ON lead_group_members(lead_id);

-- 3. RLS: allow service role full access (anon/auth roles blocked by default)
ALTER TABLE lead_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_group_members ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically — no policy needed for backend access.
-- If you want to allow authenticated users to read groups from the frontend directly, add:
-- CREATE POLICY "allow_authenticated_read" ON lead_groups FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "allow_authenticated_read" ON lead_group_members FOR SELECT USING (auth.role() = 'authenticated');
