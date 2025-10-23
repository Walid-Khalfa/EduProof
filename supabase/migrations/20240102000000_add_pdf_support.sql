-- Add PDF support columns to certificates table
-- Migration: 20240102000000_add_pdf_support.sql

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS media_mime TEXT,           -- e.g. application/pdf, image/png
  ADD COLUMN IF NOT EXISTS media_pages INTEGER,       -- number of pages if PDF
  ADD COLUMN IF NOT EXISTS preview_cid TEXT,          -- IPFS CID of generated preview (png)
  ADD COLUMN IF NOT EXISTS ocr_text JSONB;            -- raw OCR text blocks or pages

-- Add comments for documentation
COMMENT ON COLUMN certificates.media_mime IS 'MIME type of uploaded media (application/pdf, image/png, etc.)';
COMMENT ON COLUMN certificates.media_pages IS 'Number of pages for PDF documents';
COMMENT ON COLUMN certificates.preview_cid IS 'IPFS CID of generated preview image for PDFs';
COMMENT ON COLUMN certificates.ocr_text IS 'Raw OCR text extraction results (optional, for search/analysis)';

-- Create index on media_mime for filtering by type
CREATE INDEX IF NOT EXISTS idx_certificates_media_mime ON certificates(media_mime);
