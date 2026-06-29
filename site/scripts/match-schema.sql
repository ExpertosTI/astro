-- ASTRO Match — ejecutar en PostgreSQL (Insforge/PostgREST)
-- psql -f match-schema.sql

CREATE TABLE IF NOT EXISTS match_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2026',
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_swipes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2026',
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'superlike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS match_connections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2026',
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
  project_id TEXT NOT NULL DEFAULT 'ASTRO_SDQ_2026',
  match_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_profiles_project ON match_profiles (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_swipes_project ON match_swipes (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_connections_project ON match_connections (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_messages_match ON match_messages (match_id, created_at ASC);

-- PostgREST: permisos para roles anon / web_anon / authenticator
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_profiles TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_swipes TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_connections TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_messages TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    GRANT USAGE ON SCHEMA public TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_profiles TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_swipes TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_connections TO web_anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON match_messages TO web_anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    GRANT USAGE ON SCHEMA public TO authenticator;
    GRANT ALL ON match_profiles, match_swipes, match_connections, match_messages TO authenticator;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
