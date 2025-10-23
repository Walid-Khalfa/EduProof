-- Add institution_id FK column to certificates table
-- This enables PostgREST relational embeds for institutions

-- Add the column if it doesn't exist
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS institution_id uuid;

-- Backfill institution_id by matching institution_norm to institutions.name_normalized
-- This ensures existing certificates get linked to their institutions
UPDATE public.certificates c
SET institution_id = i.id
FROM public.institutions i
WHERE c.institution_id IS NULL
  AND c.institution_norm IS NOT NULL
  AND i.name_normalized = c.institution_norm;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_institution_id_fkey'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_institution_id_fkey
      FOREIGN KEY (institution_id)
      REFERENCES public.institutions(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_owner
  ON public.certificates (minter_address);

CREATE INDEX IF NOT EXISTS idx_certificates_institution_id
  ON public.certificates (institution_id);

-- Add comment for documentation
COMMENT ON COLUMN public.certificates.institution_id IS 'Foreign key to institutions table, enables relational embeds';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
