-- Normalize owner addresses to lowercase and add index
-- This ensures consistent querying regardless of address casing

-- 1) Normalize existing owner addresses to lowercase.
-- NOTE: guarded — the `owner` column is created by the LATER migration
-- 20241024000000_add_blockchain_fields.sql, so on a fresh database this
-- step is skipped and runs against the real data once that column exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'certificates'
      AND column_name = 'owner'
  ) THEN
    UPDATE public.certificates
    SET owner = lower(owner)
    WHERE owner <> lower(owner);
  END IF;
END $$;

-- 2) Create index on lowercase owner for fast lookups (same guard).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'certificates'
      AND column_name = 'owner'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'certificates'
      AND indexname = 'idx_certificates_owner_lower'
  ) THEN
    CREATE INDEX idx_certificates_owner_lower
      ON public.certificates (lower(owner));
  END IF;
END $$;

-- 3) Add unique constraint on contract+token_id for idempotency
-- This prevents duplicate entries when re-indexing the same NFT
-- (guarded: the `contract` column is created by the LATER migration
-- 20241024000000_add_blockchain_fields.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'certificates'
      AND column_name = 'contract'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_certificates_contract_token'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT uq_certificates_contract_token
      UNIQUE (contract, token_id);
  END IF;
END$$;

-- 4) Comments for documentation (guarded: index may not exist yet on fresh DBs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'certificates'
      AND indexname = 'idx_certificates_owner_lower'
  ) THEN
    COMMENT ON INDEX idx_certificates_owner_lower IS
      'Fast case-insensitive owner address lookups';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_certificates_contract_token'
  ) THEN
    COMMENT ON CONSTRAINT uq_certificates_contract_token ON public.certificates IS
      'Ensures one certificate per contract+token_id for idempotency';
  END IF;
END$$;

-- 5) Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
