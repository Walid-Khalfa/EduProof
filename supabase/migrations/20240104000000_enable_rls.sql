-- Enable Row Level Security (RLS) on all EduProof tables
-- Migration: 20240104000000_enable_rls.sql
--
-- Context:
--   The backend uses SUPABASE_SERVICE_ROLE (which has BYPASSRLS) for ALL writes,
--   so RLS only governs what the public anon/authenticated roles can do.
--
-- Policies:
--   certificates  : SELECT only for anon/authenticated (public verification),
--                   no anonymous writes.
--   institutions  : SELECT only for anon/authenticated (public registry),
--                   no anonymous writes.
--   verifications : NO anon/authenticated access at all (contains verifier IPs).
--
-- Idempotent: safe to run multiple times.

ALTER TABLE public.certificates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Ensure the Supabase anon/authenticated roles exist.
-- In a Supabase project they are always present; on a vanilla Postgres
-- (local testing, self-hosted) we create them so the policies apply.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Table privileges: Supabase grants these automatically; the explicit GRANTs
-- make the migration behave identically on a vanilla Postgres (idempotent).
GRANT SELECT ON public.certificates TO anon, authenticated;
GRANT SELECT ON public.institutions TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Certificates: read-only for public (verification use case).
-- Writes happen exclusively via the backend service_role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'certificates'
      AND policyname = 'certificates_public_select'
  ) THEN
    CREATE POLICY "certificates_public_select"
      ON public.certificates
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Institutions: read-only for public (registry visibility).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'institutions'
      AND policyname = 'institutions_public_select'
  ) THEN
    CREATE POLICY "institutions_public_select"
      ON public.institutions
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Verifications: fully private. No policy = deny by default for anon/authenticated.
-- Only the service_role (BYPASSRLS) can read or write this table.

COMMENT ON POLICY "certificates_public_select" ON public.certificates IS
  'Anyone can look up certificate records for verification; writes are server-side only.';
COMMENT ON POLICY "institutions_public_select" ON public.institutions IS
  'Institution registry is public; writes are server-side only.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
