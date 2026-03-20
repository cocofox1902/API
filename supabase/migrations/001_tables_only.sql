-- BudBeer: tables + indexes ONLY (no RLS).
-- Use this if the full 001_init.sql fails on the CREATE POLICY step.
-- After success, you can optionally run 002_rls_bars_optional.sql

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

CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  twofactorsecret TEXT,
  twofactorenabled BOOLEAN NOT NULL DEFAULT FALSE,
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banned_ips (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  deviceid TEXT,
  reason TEXT,
  bannedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rate_limit (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  deviceid TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
