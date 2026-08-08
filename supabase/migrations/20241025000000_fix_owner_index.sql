-- Fix owner index and constraint collisions
-- Migration: 20241025000000_fix_owner_index.sql
--
-- Problem 1: 20241022000000 created idx_certificates_owner on minter_address,
-- so the IF NOT EXISTS in 20241024000000 silently skipped creating the index
-- on the actual `owner` column — the most frequent query filter
-- (GET /api/certificates/owner/:address, duplicate checks).
--
-- Problem 2: on a fresh database, 20241023000000 skips creating
-- idx_certificates_owner_lower and uq_certificates_contract_token because the
-- owner/contract columns are created later (20241024000000). Without
-- uq_certificates_contract_token, the backend upsert
-- (onConflict: 'contract,token_id') fails with
-- "no unique or exclusion constraint matching the ON CONFLICT specification".
--
-- This migration runs after 20241024000000 and re-creates both if missing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'certificates'
      AND indexname = 'idx_certificates_owner_addr'
  ) THEN
    CREATE INDEX idx_certificates_owner_addr
      ON public.certificates (owner);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'certificates'
      AND indexname = 'idx_certificates_owner_lower'
  ) THEN
    CREATE INDEX idx_certificates_owner_lower
      ON public.certificates (lower(owner));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_certificates_contract_token'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT uq_certificates_contract_token
      UNIQUE (contract, token_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
