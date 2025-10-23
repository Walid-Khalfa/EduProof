-- Normalize owner addresses to lowercase and add index
-- This ensures consistent querying regardless of address casing

-- 1) Normalize existing owner addresses to lowercase
UPDATE public.certificates 
SET owner = lower(owner) 
WHERE owner <> lower(owner);

-- 2) Create index on lowercase owner for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificates_owner_lower 
ON public.certificates (lower(owner));

-- 3) Add unique constraint on contract+token_id for idempotency
-- This prevents duplicate entries when re-indexing the same NFT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_certificates_contract_token'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT uq_certificates_contract_token
      UNIQUE (contract, token_id);
  END IF;
END$$;

-- 4) Comments for documentation
COMMENT ON INDEX idx_certificates_owner_lower IS 'Fast case-insensitive owner address lookups';
COMMENT ON CONSTRAINT uq_certificates_contract_token ON public.certificates IS 'Ensures one certificate per contract+token_id for idempotency';

-- 5) Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
