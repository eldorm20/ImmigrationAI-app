-- Migration: Add Employer Verification Tables
-- Description: Create tables for employer verification across European registries
-- Generated: 2024

-- Create employer_verifications table
CREATE TABLE IF NOT EXISTS public.employer_verifications (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  application_id VARCHAR(255) REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  registry_type VARCHAR(50) NOT NULL,
  registry_id VARCHAR(255),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  company_data JSONB,
  registered_address TEXT,
  business_type VARCHAR(100),
  registration_date TIMESTAMP,
  status VARCHAR(50),
  company_number VARCHAR(100),
  director_names JSONB,
  shareholder_info JSONB,
  sic_codes JSONB,
  verification_date TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for employer_verifications
CREATE INDEX IF NOT EXISTS employer_verifications_user_id_idx 
  ON public.employer_verifications(user_id);
CREATE INDEX IF NOT EXISTS employer_verifications_application_id_idx 
  ON public.employer_verifications(application_id);
CREATE INDEX IF NOT EXISTS employer_verifications_country_idx 
  ON public.employer_verifications(country);
CREATE INDEX IF NOT EXISTS employer_verifications_status_idx 
  ON public.employer_verifications(verification_status);
CREATE INDEX IF NOT EXISTS employer_verifications_registry_id_idx 
  ON public.employer_verifications(registry_id);

-- Create employer_directory table
CREATE TABLE IF NOT EXISTS public.employer_directory (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  registry_type VARCHAR(50) NOT NULL,
  registry_id VARCHAR(255) NOT NULL,
  company_data JSONB NOT NULL,
  status VARCHAR(50),
  last_verified_at TIMESTAMP,
  verifications_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for employer_directory
CREATE INDEX IF NOT EXISTS employer_directory_company_country_registry_idx 
  ON public.employer_directory(company_name, country, registry_type);
CREATE INDEX IF NOT EXISTS employer_directory_registry_id_idx 
  ON public.employer_directory(registry_id);
CREATE INDEX IF NOT EXISTS employer_directory_last_verified_idx 
  ON public.employer_directory(last_verified_at);
