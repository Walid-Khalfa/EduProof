-- Add DB-level duplicate protection for certificates.
--
-- The backend computes a sha256 over the normalized OCR fields
-- (student_name|course_name|institution|issue_date) and stores it in
-- ocr_dedup_hash at index time. The partial unique index enforces one
-- certificate per (owner, hash) instead of relying on a client-side scan
-- that silently stops working past 100 rows per owner.
--
-- Existing rows get NULL (the partial index skips them), so backfilling is
-- not required: new inserts are protected, and the API pre-check still
-- catches duplicates against legacy rows.

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS ocr_dedup_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_owner_dedup_hash
  ON certificates (owner, ocr_dedup_hash)
  WHERE ocr_dedup_hash IS NOT NULL;

-- certificates.status is supplied by the indexing API. Constrain it so it
-- cannot carry arbitrary values that other queries might misread.
UPDATE certificates
  SET status = 'minted'
  WHERE status IS NULL OR status NOT IN ('minted', 'revoked');

ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('minted', 'revoked'));
