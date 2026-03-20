-- OPTIONAL: Row Level Security for Supabase Data API (anon reads approved bars).
-- Run only after 001_init.sql or 001_tables_only.sql succeeded.
-- Your Express API uses DATABASE_URL as postgres user → bypasses RLS.

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved bars" ON public.bars;
CREATE POLICY "Public read approved bars"
  ON public.bars
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');
