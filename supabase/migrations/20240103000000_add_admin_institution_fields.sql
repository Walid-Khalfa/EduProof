-- Add admin-related fields to institutions table
-- Adds did_uri, min_score, status columns and renames wallet_address to wallet

-- Add new columns
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS did_uri TEXT,
  ADD COLUMN IF NOT EXISTS min_score INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'revoked'));

-- Rename wallet_address to wallet for consistency
ALTER TABLE public.institutions
  RENAME COLUMN wallet_address TO wallet;

-- Update index name to match new column name
DROP INDEX IF EXISTS idx_institutions_wallet;
CREATE INDEX IF NOT EXISTS idx_institutions_wallet ON institutions(wallet);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);

-- Remove verified column (replaced by status)
ALTER TABLE public.institutions
  DROP COLUMN IF EXISTS verified;

-- Update certificates table to use institution_norm instead of institution_id for flexibility
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS institution_norm TEXT;

-- Populate institution_norm from existing institution_id relationships
UPDATE public.certificates c
SET institution_norm = i.name_normalized
FROM public.institutions i
WHERE c.institution_id = i.id AND c.institution_norm IS NULL;

-- Create index on institution_norm for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificates_institution_norm ON certificates(institution_norm);

-- Comments
COMMENT ON COLUMN institutions.did_uri IS 'Decentralized Identifier URI for institution verification';
COMMENT ON COLUMN institutions.min_score IS 'Minimum OCR verification score required for certificates';
COMMENT ON COLUMN institutions.status IS 'Institution status: approved or revoked';
COMMENT ON COLUMN certificates.institution_norm IS 'Normalized institution name for aggregation queries';
