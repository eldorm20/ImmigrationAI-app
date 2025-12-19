-- Canada Express Entry Tables
-- Migration: 0013_add_canada_tables.sql

-- Visa types for Canada
CREATE TABLE IF NOT EXISTS visa_types_canada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_code VARCHAR(50) NOT NULL UNIQUE, -- 'EXPRESS_ENTRY', 'PNP_ON', 'PNP_BC', etc.
  visa_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'work_permit', 'pr', 'study'
  processing_days INTEGER,
  processing_cost DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Express Entry Requirements (tied to NOC codes)
CREATE TABLE IF NOT EXISTS express_entry_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  noc_code VARCHAR(10) NOT NULL UNIQUE, -- National Occupation Classification
  noc_title VARCHAR(255) NOT NULL,
  min_clb_score INTEGER, -- Canadian Language Benchmark (0-12)
  min_education_level VARCHAR(50),
  preferred_experience_years INTEGER,
  max_age INTEGER,
  min_salary_cad DECIMAL(10,2),
  in_demand BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_noc_code ON express_entry_requirements(noc_code);
CREATE INDEX idx_noc_in_demand ON express_entry_requirements(in_demand);

-- Provincial Nominee Programs
CREATE TABLE IF NOT EXISTS canada_pnp_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code VARCHAR(10) NOT NULL UNIQUE, -- 'ON', 'BC', 'AB', etc.
  province_name VARCHAR(100) NOT NULL,
  priority_occupations TEXT[], -- Array of NOC codes
  min_points INTEGER,
  processing_days INTEGER,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Extend user_assessments table with Canada fields (if it exists)
-- This uses ALTER TABLE ADD COLUMN IF NOT EXISTS for safety
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_assessments') THEN
    ALTER TABLE user_assessments 
    ADD COLUMN IF NOT EXISTS canada_crs_score INTEGER,
    ADD COLUMN IF NOT EXISTS canada_express_entry_eligible BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS canada_pnp_eligible BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS canada_processing_estimate_days INTEGER,
    ADD COLUMN IF NOT EXISTS canada_assessment_data JSONB;
  END IF;
END $$;

-- Insert sample NOC codes for testing
INSERT INTO express_entry_requirements (noc_code, noc_title, min_clb_score, min_education_level, preferred_experience_years, in_demand) VALUES
('00012', 'Senior managers - financial, communications and other business services', 7, 'Bachelor', 3, TRUE),
('00013', 'Senior managers - health, education, social and community services', 7, 'Bachelor', 3, TRUE),
('20010', 'Engineering managers', 7, 'Bachelor', 3, TRUE),
('20011', 'Architecture and science managers', 7, 'Bachelor', 3, TRUE),
('21100', 'Physicists and astronomers', 9, 'PhD', 2, TRUE),
('21110', 'Biologists and related scientists', 9, 'Masters', 2, TRUE),
('21200', 'Architects', 7, 'Bachelor', 2, TRUE),
('21210', 'Mathematicians, statisticians and actuaries', 9, 'Masters', 2, TRUE),
('21220', 'Cybersecurity specialists', 7, 'Bachelor', 2, TRUE),
('21221', 'Business systems specialists', 7, 'Bachelor', 2, TRUE),
('21222', 'Information systems specialists', 7, 'Bachelor', 2, TRUE),
('21223', 'Database analysts and data administrators', 7, 'Bachelor', 2, TRUE),
('21230', 'Computer systems developers and programmers', 7, 'Bachelor', 2, TRUE),
('21231', 'Software engineers and designers', 7, 'Bachelor', 2, TRUE),
('21232', 'Software developers and programmers', 7, 'Bachelor', 2, TRUE),
('21233', 'Web designers', 5, 'College', 1, FALSE),
('21234', 'Web developers and programmers', 7, 'Bachelor', 2, TRUE)
ON CONFLICT (noc_code) DO NOTHING;

-- Insert sample PNP provinces
INSERT INTO canada_pnp_provinces (province_code, province_name, priority_occupations, min_points, processing_days) VALUES
('ON', 'Ontario', ARRAY['21231', '21232', '00012', '21220'], 67, 90),
('BC', 'British Columbia', ARRAY['21231', '21232', '00012', '21220', '21222'], 65, 75),
('AB', 'Alberta', ARRAY['21231', '00012', '20010'], 67, 60),
('MB', 'Manitoba', ARRAY['21231', '21232', '21222'], 60, 45),
('SK', 'Saskatchewan', ARRAY['21231', '00012', '21220'], 60, 50)
ON CONFLICT (province_code) DO NOTHING;

-- Insert sample Canada visa types
INSERT INTO visa_types_canada (visa_code, visa_name, category, processing_days, processing_cost) VALUES
('EXPRESS_ENTRY', 'Express Entry - Federal Skilled Worker', 'pr', 180, 1325.00),
('PNP_ON', 'Ontario Immigrant Nominee Program', 'pr', 90, 1500.00),
('PNP_BC', 'BC Provincial Nominee Program', 'pr', 75, 1150.00),
('PNP_AB', 'Alberta Immigrant Nominee Program', 'pr', 60, 1500.00),
('WORK_PERMIT', 'Temporary Work Permit', 'work_permit', 30, 155.00),
('STUDY_PERMIT', 'Study Permit', 'study', 45, 150.00)
ON CONFLICT (visa_code) DO NOTHING;
