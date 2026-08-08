-- Add DB-level duplicate protection for certificates.
--
-- The backend computes a sha256 over the normalized OCR fields
-- (student_name|course_name|institution|issue_date) and stores it in
-- ocr_dedup_hash at index time. The partial unique index enforces one
-- certificate per (owner, hash) instead of relying on a client-side scan
-- that silently stops working past 100 rows per owner.
--
-- Legacy rows are backfilled with the same transformation (lowercase, trim,
-- diacritics stripped via unaccent, whitespace collapsed) so the partial
-- index also protects pre-migration data, and the API pre-check can rely on
-- the indexed column alone. Rows without the four required OCR fields keep
-- NULL and are skipped by the index, matching the server's hash function.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS ocr_dedup_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_owner_dedup_hash
  ON certificates (owner, ocr_dedup_hash)
  WHERE ocr_dedup_hash IS NOT NULL;

-- Backfill must mirror server/utils/normalize.ts + computeOcrDedupHash:
-- btrim(regexp_replace(unaccent(lower(x)), '\s+', ' ', 'g')) joined with '|'.
UPDATE certificates
SET ocr_dedup_hash = encode(
  sha256(convert_to(
    concat_ws('|',
      lower(btrim(regexp_replace(unaccent(ocr_json->>'student_name'), '\s+', ' ', 'g'))),
      lower(btrim(regexp_replace(unaccent(ocr_json->>'course_name'), '\s+', ' ', 'g'))),
      lower(btrim(regexp_replace(unaccent(ocr_json->>'institution'), '\s+', ' ', 'g'))),
      lower(btrim(regexp_replace(unaccent(ocr_json->>'issue_date'), '\s+', ' ', 'g')))
    ),
    'UTF8'
  )),
  'hex')
WHERE ocr_dedup_hash IS NULL
  AND ocr_json IS NOT NULL
  AND ocr_json->>'student_name' IS NOT NULL AND ocr_json->>'student_name' <> ''
  AND ocr_json->>'course_name' IS NOT NULL AND ocr_json->>'course_name' <> ''
  AND ocr_json->>'institution' IS NOT NULL AND ocr_json->>'institution' <> ''
  AND ocr_json->>'issue_date' IS NOT NULL AND ocr_json->>'issue_date' <> '';

-- certificates.status is supplied by the indexing API. Constrain it so it
-- cannot carry arbitrary values that other queries might misread.
UPDATE certificates
  SET status = 'minted'
  WHERE status IS NULL OR status NOT IN ('minted', 'revoked');

ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('minted', 'revoked'));
