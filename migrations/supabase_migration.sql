-- ============================================================
-- CRM Normalization Migration
-- Run this in Supabase SQL editor BEFORE running
-- tools/migrate_to_normalized.py
-- ============================================================

-- 1. companies table
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  domain          TEXT UNIQUE NOT NULL,
  industry        TEXT,
  size            TEXT,
  phone           TEXT,
  linkedin_url    TEXT,
  instagram_url   TEXT,
  facebook_url    TEXT,
  twitter_url     TEXT,
  country         TEXT,
  notes           TEXT,
  pipeline_stage  TEXT DEFAULT 'new',
  source          TEXT,
  star_rating     NUMERIC,
  number_of_reviews INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_name   ON companies(name);

-- 2. locations table
CREATE TABLE IF NOT EXISTS locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  city           TEXT,
  state          TEXT,
  country        TEXT,
  street_address TEXT,
  postal_code    TEXT,
  phone          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, city, country)
);

CREATE INDEX IF NOT EXISTS idx_locations_company ON locations(company_id);

-- 3. contacts table (normalized leads — people with emails)
-- We keep the existing "leads" table untouched and add a new "contacts" table
-- for the normalized structure, so nothing breaks during migration.
CREATE TABLE IF NOT EXISTS contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  first_name            TEXT,
  last_name             TEXT,
  full_name             TEXT,
  title                 TEXT,
  phone                 TEXT,
  linkedin_url          TEXT,
  instagram_url         TEXT,
  specialty             TEXT,
  sub_specialties       TEXT,

  company_id            UUID REFERENCES companies(id) ON DELETE SET NULL,
  location_id           UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Email engagement
  email_status          TEXT,
  email_opens           INTEGER DEFAULT 0,
  email_replies         INTEGER DEFAULT 0,
  email_clicks          INTEGER DEFAULT 0,
  email_bounced         BOOLEAN DEFAULT false,
  last_email_event      TEXT,
  last_email_event_at   TIMESTAMPTZ,

  -- Outreach
  instantly_synced      BOOLEAN DEFAULT false,
  instantly_campaign_id TEXT,
  email_platform        TEXT,

  source                TEXT,
  raw_data              JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_email    ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company  ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(location_id);

-- 4. company_list_view — used by GET /api/companies
CREATE OR REPLACE VIEW company_list_view AS
SELECT
  c.id,
  c.name,
  c.domain,
  c.industry,
  c.size,
  c.phone,
  c.linkedin_url,
  c.instagram_url,
  c.facebook_url,
  c.twitter_url,
  c.country,
  c.pipeline_stage,
  c.source,
  c.star_rating,
  c.number_of_reviews,
  c.notes,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT l.id)  AS location_count,
  COUNT(DISTINCT ct.id) AS lead_count
FROM companies c
LEFT JOIN locations l  ON l.company_id  = c.id
LEFT JOIN contacts ct  ON ct.company_id = c.id
GROUP BY c.id;

-- 5. upsert_lead_record function — used by CSV import after migration
CREATE OR REPLACE FUNCTION upsert_lead_record(
  p_email          TEXT,
  p_first_name     TEXT,
  p_last_name      TEXT,
  p_full_name      TEXT,
  p_title          TEXT,
  p_phone          TEXT,
  p_linkedin       TEXT,
  p_instagram      TEXT,
  p_company_name   TEXT,
  p_company_domain TEXT,
  p_industry       TEXT,
  p_city           TEXT,
  p_state          TEXT,
  p_country        TEXT,
  p_source         TEXT
) RETURNS UUID AS $$
DECLARE
  v_company_id  UUID;
  v_location_id UUID;
  v_lead_id     UUID;
  v_domain      TEXT;
BEGIN
  -- Normalize domain: lowercase, strip protocol/www/trailing slash
  v_domain := lower(
    regexp_replace(
      regexp_replace(p_company_domain, '^(https?://)?(www\.)?', ''),
      '/$', ''
    )
  );

  IF v_domain = '' OR v_domain IS NULL THEN
    RETURN NULL;
  END IF;

  -- Upsert company
  INSERT INTO companies (name, domain, industry, country, source)
  VALUES (p_company_name, v_domain, p_industry, p_country, p_source)
  ON CONFLICT (domain) DO UPDATE SET
    name       = COALESCE(NULLIF(companies.name, ''),     EXCLUDED.name),
    industry   = COALESCE(companies.industry,             EXCLUDED.industry),
    updated_at = now()
  RETURNING id INTO v_company_id;

  -- Upsert location (only if city provided)
  IF p_city IS NOT NULL AND p_city != '' THEN
    INSERT INTO locations (company_id, city, state, country)
    VALUES (v_company_id, p_city, p_state, p_country)
    ON CONFLICT (company_id, city, country) DO UPDATE SET
      state      = COALESCE(locations.state, EXCLUDED.state),
      updated_at = now()
    RETURNING id INTO v_location_id;
  END IF;

  -- Upsert contact (only if email provided)
  IF p_email IS NOT NULL AND p_email != '' THEN
    INSERT INTO contacts (
      email, first_name, last_name, full_name, title, phone,
      linkedin_url, instagram_url, company_id, location_id, source
    ) VALUES (
      lower(p_email), p_first_name, p_last_name, p_full_name, p_title,
      p_phone, p_linkedin, p_instagram, v_company_id, v_location_id, p_source
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name  = COALESCE(NULLIF(contacts.first_name, ''),  EXCLUDED.first_name),
      last_name   = COALESCE(NULLIF(contacts.last_name, ''),   EXCLUDED.last_name),
      full_name   = COALESCE(NULLIF(contacts.full_name, ''),   EXCLUDED.full_name),
      title       = COALESCE(contacts.title,                   EXCLUDED.title),
      phone       = COALESCE(contacts.phone,                   EXCLUDED.phone),
      linkedin_url= COALESCE(contacts.linkedin_url,            EXCLUDED.linkedin_url),
      company_id  = COALESCE(contacts.company_id,              EXCLUDED.company_id),
      location_id = COALESCE(contacts.location_id,             EXCLUDED.location_id),
      updated_at  = now()
    RETURNING id INTO v_lead_id;
  END IF;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. lead_stages table
-- One row per lead — tracks the current pipeline stage.
-- Required by get_pipeline_leads() in core/supabase_client.py
-- which does: SELECT ... lead_stages(stage)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_stages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage      TEXT NOT NULL DEFAULT 'new',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_stages_lead_id ON lead_stages(lead_id);

-- ============================================================
-- 7. activities table
-- Required by get_lead_by_id() in core/supabase_client.py
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);

-- ============================================================
-- 8. get_analytics_summary RPC
-- Called by frontend/src/hooks/useAnalytics.ts via supabase.rpc()
-- Returns JSON matching the AnalyticsSummary interface in
-- frontend/src/types/index.ts
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'unique_companies',     (SELECT COUNT(DISTINCT company_name) FROM leads WHERE company_name IS NOT NULL AND company_name <> ''),
    'total_locations',      (SELECT COUNT(DISTINCT (city, company_name)) FROM leads WHERE city IS NOT NULL),
    'unique_leads',         (SELECT COUNT(DISTINCT email) FROM leads WHERE email IS NOT NULL AND email <> ''),
    'total_rows',           (SELECT COUNT(*) FROM leads),
    'total_unique_emails',  (SELECT COUNT(DISTINCT email) FROM leads WHERE email IS NOT NULL AND email <> ''),
    'leads_with_email',     (SELECT COUNT(*) FROM leads WHERE email IS NOT NULL AND email <> ''),
    'leads_with_phone',     (SELECT COUNT(*) FROM leads WHERE phone IS NOT NULL AND phone <> ''),
    'leads_with_linkedin',  (SELECT COUNT(*) FROM leads WHERE linkedin IS NOT NULL AND linkedin <> ''),
    'companies_with_phone', (SELECT COUNT(DISTINCT company_name) FROM leads WHERE phone IS NOT NULL AND phone <> '' AND company_name IS NOT NULL),
    'avg_completeness',     (
      SELECT ROUND(AVG(
        (CASE WHEN email IS NOT NULL AND email <> '' THEN 1 ELSE 0 END +
         CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END +
         CASE WHEN first_name IS NOT NULL AND first_name <> '' THEN 1 ELSE 0 END +
         CASE WHEN last_name IS NOT NULL AND last_name <> '' THEN 1 ELSE 0 END +
         CASE WHEN company_name IS NOT NULL AND company_name <> '' THEN 1 ELSE 0 END +
         CASE WHEN country IS NOT NULL AND country <> '' THEN 1 ELSE 0 END +
         CASE WHEN city IS NOT NULL AND city <> '' THEN 1 ELSE 0 END +
         CASE WHEN title IS NOT NULL AND title <> '' THEN 1 ELSE 0 END +
         CASE WHEN linkedin IS NOT NULL AND linkedin <> '' THEN 1 ELSE 0 END +
         CASE WHEN industry IS NOT NULL AND industry <> '' THEN 1 ELSE 0 END +
         CASE WHEN company_size IS NOT NULL AND company_size <> '' THEN 1 ELSE 0 END
        )::numeric / 11.0 * 100
      ), 1)
      FROM leads
    ),
    'email_status',         (
      SELECT json_agg(json_build_object('status', email_status, 'count', cnt))
      FROM (
        SELECT COALESCE(email_status, 'unchecked') AS email_status, COUNT(*) AS cnt
        FROM leads GROUP BY 1 ORDER BY cnt DESC
      ) t
    ),
    'country',              (
      SELECT json_agg(json_build_object('country', country, 'count', cnt))
      FROM (
        SELECT country, COUNT(*) AS cnt
        FROM leads WHERE country IS NOT NULL AND country <> ''
        GROUP BY 1 ORDER BY cnt DESC LIMIT 15
      ) t
    ),
    'company_size',         (
      SELECT json_agg(json_build_object('size', company_size, 'count', cnt))
      FROM (
        SELECT COALESCE(company_size, 'Unknown') AS company_size, COUNT(*) AS cnt
        FROM leads GROUP BY 1 ORDER BY cnt DESC
      ) t
    ),
    'lead_quality',         (
      SELECT json_agg(json_build_object('tier', lead_tier, 'count', cnt))
      FROM (
        SELECT COALESCE(lead_tier, 'unscored') AS lead_tier, COUNT(*) AS cnt
        FROM leads GROUP BY 1 ORDER BY cnt DESC
      ) t
    ),
    'completeness_buckets', (
      SELECT json_agg(json_build_object('bucket', bucket, 'count', cnt))
      FROM (
        SELECT
          CASE
            WHEN score >= 80 THEN 'Excellent'
            WHEN score >= 60 THEN 'Good'
            WHEN score >= 40 THEN 'Partial'
            ELSE 'Poor'
          END AS bucket,
          COUNT(*) AS cnt
        FROM (
          SELECT (
            (CASE WHEN email IS NOT NULL AND email <> '' THEN 1 ELSE 0 END +
             CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END +
             CASE WHEN first_name IS NOT NULL AND first_name <> '' THEN 1 ELSE 0 END +
             CASE WHEN last_name IS NOT NULL AND last_name <> '' THEN 1 ELSE 0 END +
             CASE WHEN company_name IS NOT NULL AND company_name <> '' THEN 1 ELSE 0 END +
             CASE WHEN country IS NOT NULL AND country <> '' THEN 1 ELSE 0 END +
             CASE WHEN city IS NOT NULL AND city <> '' THEN 1 ELSE 0 END +
             CASE WHEN title IS NOT NULL AND title <> '' THEN 1 ELSE 0 END +
             CASE WHEN linkedin IS NOT NULL AND linkedin <> '' THEN 1 ELSE 0 END +
             CASE WHEN industry IS NOT NULL AND industry <> '' THEN 1 ELSE 0 END +
             CASE WHEN company_size IS NOT NULL AND company_size <> '' THEN 1 ELSE 0 END
            )::numeric / 11.0 * 100
          ) AS score
          FROM leads
        ) scores
        GROUP BY 1
        ORDER BY MIN(CASE WHEN score >= 80 THEN 1 WHEN score >= 60 THEN 2 WHEN score >= 40 THEN 3 ELSE 4 END)
      ) t
    ),
    'duplicates', json_build_object(
      'total_lead_rows',      (SELECT COUNT(*) FROM leads),
      'unique_lead_count',    (SELECT COUNT(DISTINCT email) FROM leads WHERE email IS NOT NULL AND email <> ''),
      'unique_company_count', (SELECT COUNT(DISTINCT company_name) FROM leads WHERE company_name IS NOT NULL AND company_name <> ''),
      'total_rows',           (SELECT COUNT(*) FROM leads)
    )
  );
$$;
