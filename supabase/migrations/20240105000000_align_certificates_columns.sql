-- Align certificates table with the backend insert contract
-- Migration: 20240105000000_align_certificates_columns.sql
--
-- The backend (server/routes/certificates.ts POST /api/certificates/index) stores
-- extracted student/course data inside the ocr_json JSONB column and does NOT
-- populate the legacy student_name/course_name columns. On a fresh database the
-- NOT NULL constraint makes every index insert fail with a violation.
-- Making them nullable keeps them for backward compatibility / analytics.

ALTER TABLE public.certificates
  ALTER COLUMN student_name DROP NOT NULL;

ALTER TABLE public.certificates
  ALTER COLUMN course_name DROP NOT NULL;

COMMENT ON COLUMN public.certificates.student_name IS
  'Legacy denormalized field (deprecated). Current data lives in ocr_json.';
COMMENT ON COLUMN public.certificates.course_name IS
  'Legacy denormalized field (deprecated). Current data lives in ocr_json.';

NOTIFY pgrst, 'reload schema';
