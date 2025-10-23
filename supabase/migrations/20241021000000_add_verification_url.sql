-- Add verification_url column to certificates table
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS verification_url text;

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_certificates_verification_url
  ON public.certificates (verification_url)
  WHERE verification_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.certificates.verification_url IS 'Canonical verification URL extracted from certificate or inferred from institution';
