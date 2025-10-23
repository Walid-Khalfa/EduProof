-- EduProof Database Schema
-- Tables for institutions, certificates, and verifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Institutions table
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  wallet_address TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on normalized name for fast lookups
CREATE INDEX IF NOT EXISTS idx_institutions_name_normalized ON institutions(name_normalized);
CREATE INDEX IF NOT EXISTS idx_institutions_wallet ON institutions(wallet_address);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cert_id TEXT NOT NULL,
  cert_id_normalized TEXT NOT NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  issue_date TEXT,
  token_id BIGINT,
  ipfs_image_hash TEXT,
  ipfs_metadata_hash TEXT,
  tx_hash TEXT,
  minter_address TEXT,
  verification_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one cert_id per institution (normalized)
  CONSTRAINT unique_cert_per_institution UNIQUE (cert_id_normalized, institution_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_certificates_cert_id_normalized ON certificates(cert_id_normalized);
CREATE INDEX IF NOT EXISTS idx_certificates_institution ON certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_certificates_token_id ON certificates(token_id);
CREATE INDEX IF NOT EXISTS idx_certificates_minter ON certificates(minter_address);
CREATE INDEX IF NOT EXISTS idx_certificates_tx_hash ON certificates(tx_hash);

-- Verifications table (track who verified which certificate)
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  verifier_address TEXT,
  verifier_ip TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for verification queries
CREATE INDEX IF NOT EXISTS idx_verifications_certificate ON verifications(certificate_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verifier ON verifications(verifier_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE institutions IS 'Educational institutions that issue certificates';
COMMENT ON TABLE certificates IS 'Minted certificates with IPFS and blockchain data';
COMMENT ON TABLE verifications IS 'Track certificate verification attempts';
COMMENT ON COLUMN certificates.cert_id_normalized IS 'Normalized certificate ID for duplicate detection';
COMMENT ON CONSTRAINT unique_cert_per_institution ON certificates IS 'Ensures one certificate ID per institution';
