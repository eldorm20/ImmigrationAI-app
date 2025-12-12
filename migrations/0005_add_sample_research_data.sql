-- Sample research articles for testing
INSERT INTO research_articles (
  title, slug, summary, body, category, type, language, tags, source, is_published, created_at
) VALUES
  (
    'UK Skilled Worker Visa Requirements 2024',
    'uk-skilled-worker-visa-requirements-2024',
    'Complete guide to UK Skilled Worker visa requirements including salary thresholds, job offer requirements, and application process.',
    'The UK Skilled Worker visa is designed for foreign nationals who have been offered a job in the UK. Key requirements include: a job offer from a licensed sponsor, minimum salary of £26,200 or the apprentice minimum wage whichever is higher, English language proficiency, and adequate maintenance funds. The visa is valid for up to 6 years depending on the role. Applications are processed within 3-4 weeks.',
    'visa',
    'guide',
    'en',
    '["uk", "visa", "skilled-worker", "requirements"]'::jsonb,
    'UK Visas and Immigration',
    true,
    NOW()
  ),
  (
    'US EB-3 Employment-Based Green Card Process',
    'us-eb3-employment-based-green-card-process',
    'Comprehensive overview of the EB-3 employment-based green card category, timeline, and requirements.',
    'The EB-3 category is for skilled workers, professionals, and other workers. The process involves labor certification, immigrant petition, and consular processing. Average timeline is 2-3 years. Applicants must meet specific educational and experience requirements. Priority date is important for tracking.',
    'visa',
    'guide',
    'en',
    '["us", "green-card", "eb3", "employment"]'::jsonb,
    'USCIS',
    true,
    NOW()
  ),
  (
    'Canadian Express Entry System Explained',
    'canadian-express-entry-system-explained',
    'Detailed explanation of the Canadian Express Entry system, CRS score calculation, and application process.',
    'Express Entry is Canada''s immigration system for skilled workers. The system uses a Comprehensive Ranking System (CRS) to score applicants. Points are awarded for factors like age, education, language ability, and work experience. Regular draws invite candidates with highest scores. Processing time is typically 6 months.',
    'visa',
    'guide',
    'en',
    '["canada", "express-entry", "skilled-immigration"]'::jsonb,
    'Immigration, Refugees and Citizenship Canada',
    true,
    NOW()
  ),
  (
    'Document Requirements for Visa Applications',
    'document-requirements-for-visa-applications',
    'Standard documents needed for most visa applications including passports, birth certificates, police clearance, and medical exams.',
    'Most visa applications require similar core documentation: valid passport (at least 6 months validity), birth certificate, marriage certificate (if applicable), police clearance certificate, medical examination results, and proof of funds. Document requirements vary by country and visa type. Always check specific requirements with the embassy.',
    'regulations',
    'guide',
    'en',
    '["documents", "requirements", "visa", "checklist"]'::jsonb,
    'International Immigration Council',
    true,
    NOW()
  ),
  (
    'Proof of Funds: Everything You Need to Know',
    'proof-of-funds-everything-you-need-to-know',
    'Guide to demonstrating proof of funds for visa applications including bank statements, sponsor letters, and investment documents.',
    'Proof of funds demonstrates financial capability to support yourself during visa process and stay. Acceptable documents include recent bank statements (typically 6-12 months), salary statements, investment account statements, and sponsor support letters. Funds must be liquid and available. Minimum amounts vary by country and visa type.',
    'regulations',
    'guide',
    'en',
    '["proof-of-funds", "financial", "requirements"]'::jsonb,
    'Immigration Lawyers Association',
    true,
    NOW()
  ),
  (
    'Language Test Requirements by Country',
    'language-test-requirements-by-country',
    'Overview of language testing requirements including IELTS, TOEFL, and other accepted language proficiency tests.',
    'Most countries accept specific language tests for visa applications. UK and Canada typically require IELTS or Pearson English Test. US commonly accepts TOEFL. Minimum scores vary by visa type and country. Test results are typically valid for 2-3 years. Private language schools offer preparation courses.',
    'regulations',
    'guide',
    'en',
    '["language-tests", "ielts", "toefl", "requirements"]'::jsonb,
    'ETS and Cambridge Assessment',
    true,
    NOW()
  );

-- Add more sample articles based on user requests
INSERT INTO research_articles (
  title, slug, summary, body, category, type, language, tags, source, is_published, created_at
) VALUES
  (
    'Recent UK Immigration Law Changes 2024',
    'recent-uk-immigration-law-changes-2024',
    'Summary of recent changes to UK immigration law affecting visa categories, salary requirements, and application processes.',
    'Recent UK immigration reforms have increased salary thresholds for Skilled Worker visas and introduced new regulations. The healthcare surcharge has been modified. Family visa sponsorship rules have been tightened. These changes affect both new applicants and those renewing visas.',
    'regulations',
    'blog',
    'en',
    '["uk", "immigration-law", "changes", "2024"]'::jsonb,
    'UK Home Office Updates',
    true,
    NOW()
  );
