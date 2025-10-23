-- Add blockchain-related fields to certificates table
-- These fields are needed for proper NFT indexing and tracking

-- Add missing columns for blockchain data
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS contract TEXT,
  ADD COLUMN IF NOT EXISTS owner TEXT,
  ADD COLUMN IF NOT EXISTS token_uri TEXT,
  ADD COLUMN IF NOT EXISTS image_cid TEXT,
  ADD COLUMN IF NOT EXISTS meta_cid TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS ocr_json JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'minted',
  ADD COLUMN IF NOT EXISTS institution TEXT;

-- Normalize existing owner addresses to lowercase
UPDATE public.certificates 
SET owner = lower(owner) 
WHERE owner IS NOT NULL AND owner <> lower(owner);

-- Normalize existing contract addresses to lowercase
UPDATE public.certificates 
SET contract = lower(contract) 
WHERE contract IS NOT NULL AND contract <> lower(contract);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_chain_id ON certificates(chain_id);
CREATE INDEX IF NOT EXISTS idx_certificates_contract ON certificates(contract);
CREATE INDEX IF NOT EXISTS idx_certificates_owner ON certificates(owner);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

-- Add comments for documentation
COMMENT ON COLUMN certificates.chain_id IS 'Blockchain chain ID (e.g., 1 for Ethereum mainnet, 11155111 for Sepolia)';
COMMENT ON COLUMN certificates.contract IS 'Smart contract address (lowercase)';
COMMENT ON COLUMN certificates.owner IS 'Certificate owner wallet address (lowercase)';
COMMENT ON COLUMN certificates.token_uri IS 'IPFS URI for NFT metadata';
COMMENT ON COLUMN certificates.image_cid IS 'IPFS CID for certificate image';
COMMENT ON COLUMN certificates.meta_cid IS 'IPFS CID for NFT metadata JSON';
COMMENT ON COLUMN certificates.score IS 'OCR verification score (0-100)';
COMMENT ON COLUMN certificates.ocr_json IS 'Full OCR extraction results as JSON';
COMMENT ON COLUMN certificates.status IS 'Certificate status (minted, revoked, etc.)';
COMMENT ON COLUMN certificates.institution IS 'Institution name (denormalized for convenience)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
