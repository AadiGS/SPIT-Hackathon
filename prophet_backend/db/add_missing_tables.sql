-- Prophet Backend - Missing Tables Migration
-- Run this on Neon DB to add csv_files, users, and otp_codes tables

-- csv_files table (track uploads)
CREATE TABLE IF NOT EXISTS csv_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    size_bytes BIGINT,
    row_count INTEGER,
    column_count INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'uploaded',
    forecasts_generated BOOLEAN DEFAULT FALSE,
    UNIQUE(company_id, file_id)
);

-- users table (OTP auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- otp_codes table (hardcoded OTP)
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_csv_files_company_id ON csv_files(company_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_file_id ON csv_files(file_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);

-- Insert test users for both companies
INSERT INTO users (company_id, email, name, role) VALUES
('306b5293-39bc-4cbc-bef0-9e9f87072e5c', 'admin@techinnovations.com', 'Admin Tech', 'admin'),
('c96b8b3a-e979-4ca0-a28b-b772e730d46b', 'admin@medicare.com', 'Admin Medicare', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Hardcoded OTP: "123456" for all users (valid for 1 year for demo)
INSERT INTO otp_codes (email, otp_code, expires_at) VALUES
('admin@techinnovations.com', '123456', now() + interval '1 year'),
('admin@medicare.com', '123456', now() + interval '1 year')
ON CONFLICT DO NOTHING;

