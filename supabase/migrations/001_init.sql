-- BudBeer API schema for Supabase Postgres
-- Run once in Supabase SQL Editor (or psql) before starting the API with RUN_API_DDL=false.
-- Column names are lowercase to match node-pg result keys and existing API queries.
--
-- If CREATE POLICY fails: run 001_tables_only.sql first, then optionally 002_rls_bars_optional.sql
-- See SETUP_SUPABASE.md in the API folder.

-- Bars
CREATE TABLE IF NOT EXISTS public.bars (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  regularprice DOUBLE PRECISION NOT NULL,
  happyhourprice DOUBLE PRECISION,
  happyhourstart TEXT,
  happyhourend TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submittedbyip TEXT,
  deviceid TEXT,
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bars_status ON public.bars (status);
CREATE INDEX IF NOT EXISTS idx_bars_createdat ON public.bars (createdat DESC);

-- Admin users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  twofactorsecret TEXT,
  twofactorenabled BOOLEAN NOT NULL DEFAULT FALSE,
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Banned IPs / devices
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  deviceid TEXT,
  reason TEXT,
  bannedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate limit log (reserved for future use)
CREATE TABLE IF NOT EXISTS public.rate_limit (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  deviceid TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  barid BIGINT NOT NULL REFERENCES public.bars (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reportedbyip TEXT,
  deviceid TEXT,
  reportedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_reports_barid ON public.reports (barid);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

-- Optional: Row Level Security for future Supabase Data API / anon reads (Express postgres user bypasses RLS)
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved bars" ON public.bars;
CREATE POLICY "Public read approved bars"
  ON public.bars
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Service role and direct DB connections bypass RLS; no INSERT/UPDATE policies here so public clients cannot mutate via PostgREST without additional policies.
