-- ASTRO Match — ejecutar en PostgreSQL (Insforge/PostgREST)
-- psql -f match-schema.sql

CREATE TABLE IF NOT EXISTS match_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  role TEXT NOT NULL CHECK (role IN ('tatuador', 'lienzo')),
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  city TEXT DEFAULT 'Santo Domingo',
  avatar_url TEXT DEFAULT '',
  portfolio_urls JSONB DEFAULT '[]'::jsonb,
  body_parts JSONB DEFAULT '[]'::jsonb,
  body_part_photos JSONB DEFAULT '[]'::jsonb,
  availability JSONB DEFAULT '[]'::jsonb,
  badges JSONB DEFAULT '[]'::jsonb,
  willing_to_pay BOOLEAN DEFAULT FALSE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  session_min_rate NUMERIC,
  rate_open_to_discuss BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_swipes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'superlike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS match_connections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  tatuador_id TEXT NOT NULL,
  lienzo_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'matched', 'rejected')),
  initiated_by TEXT NOT NULL,
  is_super_like BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  UNIQUE (tatuador_id, lienzo_id)
);

CREATE TABLE IF NOT EXISTS match_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  match_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS match_typing (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

-- Migración para instalaciones existentes
ALTER TABLE match_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE match_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE match_profiles ADD COLUMN IF NOT EXISTS willing_to_pay BOOLEAN DEFAULT FALSE;
ALTER TABLE match_profiles ADD COLUMN IF NOT EXISTS budget_min NUMERIC;
ALTER TABLE match_profiles ADD COLUMN IF NOT EXISTS budget_max NUMERIC;
ALTER TABLE match_profiles ADD COLUMN IF NOT EXISTS session_min_rate NUMERIC;
ALTER TABLE match_profiles ADD COLUMN IF NOT EXISTS rate_open_to_discuss BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS match_push_tokens (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, platform, token)
);

CREATE INDEX IF NOT EXISTS idx_match_push_tokens_user ON match_push_tokens (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_profiles_project ON match_profiles (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_swipes_project ON match_swipes (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_connections_project ON match_connections (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_messages_match ON match_messages (match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_match_typing_project ON match_typing (project_id, updated_at DESC);

-- Landing registration leads (POST /api/insforge/leads)
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  contact_value TEXT NOT NULL,
  contact_value_2 TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'mail',
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2027',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_project ON leads (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);

-- PostgREST: permisos para roles anon / web_anon / authenticator
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_profiles TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_swipes TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_connections TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_messages TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_typing TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_push_tokens TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO anon;
    BEGIN
      GRANT USAGE, SELECT ON SEQUENCE leads_id_seq TO anon;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    GRANT USAGE ON SCHEMA public TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_profiles TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_swipes TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_connections TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_messages TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_typing TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_push_tokens TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO web_anon;
    BEGIN
      GRANT USAGE, SELECT ON SEQUENCE leads_id_seq TO web_anon;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    GRANT USAGE ON SCHEMA public TO authenticator;
    GRANT ALL ON match_profiles, match_swipes, match_connections, match_messages, match_typing, match_push_tokens, leads TO authenticator;
    BEGIN
      GRANT USAGE, SELECT ON SEQUENCE leads_id_seq TO authenticator;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
