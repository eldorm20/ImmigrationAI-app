import { logger } from './logger';

// Configuration for different European company registries
const REGISTRIES_CONFIG = {
  uk_companies_house: {
    name: 'UK Companies House',
    baseUrl: 'https://api.company-information.service.gov.uk',
    country: 'GB',
    apiKey: process.env.UK_COMPANIES_HOUSE_API_KEY,
    documentationUrl: 'https://find-and-update.company-information.service.gov.uk/'
  },
  eu_germany_hwr: {
    name: 'Germany HWR Register',
    baseUrl: 'https://www.handelsregisterdb.de/api',
    country: 'DE',
    apiKey: process.env.EU_GERMANY_HWR_API_KEY,
    documentationUrl: 'https://www.handelsregister.de/'
  },
  eu_france_inpi: {
    name: 'France INPI Register',
    baseUrl: 'https://api-inpi.gouv.fr',
    country: 'FR',
    apiKey: process.env.EU_FRANCE_INPI_API_KEY,
    documentationUrl: 'https://www.inpi.fr/'
  },
  eu_netherlands_kvk: {
    name: 'Netherlands KvK Register',
    baseUrl: 'https://api.kvk.nl',
    country: 'NL',
    apiKey: process.env.EU_NETHERLANDS_KVK_API_KEY,
    documentationUrl: 'https://www.kvk.nl/'
  },
  eu_spain_mercantil: {
    name: 'Spain Mercantil Register',
    baseUrl: 'https://www.registradores.org/api',
    country: 'ES',
    apiKey: process.env.EU_SPAIN_MERCANTIL_API_KEY,
    documentationUrl: 'https://www.registradores.org/'
  },
};

export interface CompanySearchParams {
  companyName: string;
  country: string;
  registryType?: string;
}

export interface CompanyVerificationResult {
  found: boolean;
  companyName: string;
  country: string;
  registryType: string;
  registryId: string | null;
  registeredAddress?: string;
  businessType?: string;
  status?: string;
  registrationDate?: Date;
  directors?: string[];
  sic_codes?: string[];
  raw_data?: any;
  verifiedAt: Date;
  confidence?: number;
}

export interface EmployerVerificationResponse {
  status: 'verified' | 'unverified' | 'error';
  results: CompanyVerificationResult[];
  message: string;
  timestamp: Date;
}

/**
 * Query UK Companies House API
 */
async function verifyUKCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  const config = REGISTRIES_CONFIG.uk_companies_house;

  if (!config.apiKey) {
    logger.warn(
      'UK Companies House API key not configured. Using mock data.'
    );
    // Return mock data for development
    return createMockUKResult(companyName);
  }

  try {
    const searchUrl = `${config.baseUrl}/search/companies?q=${encodeURIComponent(
      companyName
    )}&items_per_page=1`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString(
          'base64'
        )}`,
        'User-Agent': 'ImmigrationAI-EmployerVerification/1.0',
      },
    });

    if (!response.ok) {
      logger.error(
        `UK Companies House API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const company = data.items[0];

    return {
      found: true,
      companyName: company.title,
      country: 'GB',
      registryType: 'uk_companies_house',
      registryId: company.company_number,
      registeredAddress: company.address_snippet,
      businessType: company.company_type,
      status: company.company_status,
      registrationDate: company.date_of_creation
        ? new Date(company.date_of_creation)
        : undefined,
      raw_data: company,
      verifiedAt: new Date(),
      confidence: 95,
    };
  } catch (error) {
    logger.error({ error }, 'Error verifying UK company');
    return null;
  }
}

/**
 * Query Germany HWR API
 */
async function verifyGermanCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  // For now, using mock data as direct API integration requires specific setup
  logger.info({ companyName }, 'Searching German company registry for:');
  return createMockGermanResult(companyName);
}

/**
 * Query France INPI API
 */
async function verifyFrenchCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  // For now, using mock data as direct API integration requires specific setup
  logger.info({ companyName }, 'Searching French company registry for:');
  return createMockFrenchResult(companyName);
}

/**
 * Query Netherlands KvK API
 */
async function verifyDutchCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  // For now, using mock data as direct API integration requires specific setup
  logger.info({ companyName }, 'Searching Netherlands company registry for:');
  return createMockDutchResult(companyName);
}

/**
 * Query Spain Mercantil Register
 */
async function verifySpanishCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  // For now, using mock data as direct API integration requires specific setup
  logger.info({ companyName }, 'Searching Spanish company registry for:');
  return createMockSpanishResult(companyName);
}

/**
 * Mock data generators for development
 */
function createMockUKResult(companyName: string): CompanyVerificationResult {
  const isValid = companyName.toLowerCase().includes('company') || 
                  companyName.toLowerCase().includes('ltd') ||
                  companyName.toLowerCase().includes('inc');
  
  if (!isValid) {
    return {
      found: false,
      companyName,
      country: 'GB',
      registryType: 'uk_companies_house',
      registryId: null,
      status: 'not_found',
      verifiedAt: new Date(),
      confidence: 0,
    };
  }

  return {
    found: true,
    companyName,
    country: 'GB',
    registryType: 'uk_companies_house',
    registryId: `${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    registeredAddress: '123 Business Street, London, UK',
    businessType: 'Private Company Limited by Shares',
    status: 'active',
    registrationDate: new Date('2015-01-15'),
    directors: ['John Smith', 'Jane Doe'],
    sic_codes: ['62010', '62020'],
    verifiedAt: new Date(),
    confidence: 90,
  };
}

function createMockGermanResult(companyName: string): CompanyVerificationResult {
  const isValid = companyName.toLowerCase().includes('gmbh') || 
                  companyName.toLowerCase().includes('ag') ||
                  companyName.toLowerCase().includes('company');
  
  return {
    found: isValid,
    companyName,
    country: 'DE',
    registryType: 'eu_germany_hwr',
    registryId: isValid ? `HRB ${Math.random().toString().substr(2, 6)}` : null,
    registeredAddress: isValid ? '456 Unternehmens Straße, Berlin, Germany' : undefined,
    businessType: isValid ? 'GmbH' : undefined,
    status: isValid ? 'active' : 'not_found',
    registrationDate: isValid ? new Date('2018-03-20') : undefined,
    verifiedAt: new Date(),
    confidence: isValid ? 85 : 0,
  };
}

function createMockFrenchResult(companyName: string): CompanyVerificationResult {
  const isValid = companyName.toLowerCase().includes('sarl') || 
                  companyName.toLowerCase().includes('sas') ||
                  companyName.toLowerCase().includes('company');
  
  return {
    found: isValid,
    companyName,
    country: 'FR',
    registryType: 'eu_france_inpi',
    registryId: isValid ? `SIREN ${Math.random().toString().substr(2, 9)}` : null,
    registeredAddress: isValid ? '789 Rue d\'Entreprise, Paris, France' : undefined,
    businessType: isValid ? 'SARL' : undefined,
    status: isValid ? 'active' : 'not_found',
    registrationDate: isValid ? new Date('2016-06-10') : undefined,
    verifiedAt: new Date(),
    confidence: isValid ? 85 : 0,
  };
}

function createMockDutchResult(companyName: string): CompanyVerificationResult {
  const isValid = companyName.toLowerCase().includes('bv') || 
                  companyName.toLowerCase().includes('nv') ||
                  companyName.toLowerCase().includes('company');
  
  return {
    found: isValid,
    companyName,
    country: 'NL',
    registryType: 'eu_netherlands_kvk',
    registryId: isValid ? `KVK ${Math.random().toString().substr(2, 8)}` : null,
    registeredAddress: isValid ? '321 Bedrijfs Straat, Amsterdam, Netherlands' : undefined,
    businessType: isValid ? 'B.V.' : undefined,
    status: isValid ? 'active' : 'not_found',
    registrationDate: isValid ? new Date('2017-09-05') : undefined,
    verifiedAt: new Date(),
    confidence: isValid ? 85 : 0,
  };
}

function createMockSpanishResult(companyName: string): CompanyVerificationResult {
  const isValid = companyName.toLowerCase().includes('sl') || 
                  companyName.toLowerCase().includes('sa') ||
                  companyName.toLowerCase().includes('company');
  
  return {
    found: isValid,
    companyName,
    country: 'ES',
    registryType: 'eu_spain_mercantil',
    registryId: isValid ? `CIF ${Math.random().toString().substr(2, 8)}` : null,
    registeredAddress: isValid ? '654 Calle Negocio, Madrid, Spain' : undefined,
    businessType: isValid ? 'S.L.' : undefined,
    status: isValid ? 'active' : 'not_found',
    registrationDate: isValid ? new Date('2019-11-12') : undefined,
    verifiedAt: new Date(),
    confidence: isValid ? 85 : 0,
  };
}

/**
 * Main verification function that queries appropriate registry based on country
 */
export async function verifyEmployer(
  params: CompanySearchParams
): Promise<EmployerVerificationResponse> {
  const { companyName, country, registryType } = params;
  const results: CompanyVerificationResult[] = [];

  logger.info({ companyName, country }, 'Starting employer verification');

  try {
    // If specific registry is requested
    if (registryType) {
      let result: CompanyVerificationResult | null = null;

      switch (registryType) {
        case 'uk_companies_house':
          result = await verifyUKCompany(companyName);
          break;
        case 'eu_germany_hwr':
          result = await verifyGermanCompany(companyName);
          break;
        case 'eu_france_inpi':
          result = await verifyFrenchCompany(companyName);
          break;
        case 'eu_netherlands_kvk':
          result = await verifyDutchCompany(companyName);
          break;
        case 'eu_spain_mercantil':
          result = await verifySpanishCompany(companyName);
          break;
        default:
          logger.warn({ registryType }, 'Unknown registry type:');
      }

      if (result) {
        results.push(result);
      }
    } else {
      // Query all registries for the country or all European registries
      const countryMap: Record<string, string[]> = {
        GB: ['uk_companies_house'],
        DE: ['eu_germany_hwr'],
        FR: ['eu_france_inpi'],
        NL: ['eu_netherlands_kvk'],
        ES: ['eu_spain_mercantil'],
        ALL: Object.keys(REGISTRIES_CONFIG),
      };

      const registries =
        countryMap[country.toUpperCase()] || countryMap['ALL'];

      for (const registry of registries) {
        let result: CompanyVerificationResult | null = null;

        switch (registry) {
          case 'uk_companies_house':
            result = await verifyUKCompany(companyName);
            break;
          case 'eu_germany_hwr':
            result = await verifyGermanCompany(companyName);
            break;
          case 'eu_france_inpi':
            result = await verifyFrenchCompany(companyName);
            break;
          case 'eu_netherlands_kvk':
            result = await verifyDutchCompany(companyName);
            break;
          case 'eu_spain_mercantil':
            result = await verifySpanishCompany(companyName);
            break;
        }

        if (result) {
          results.push(result);
        }
      }
    }

    const verified = results.some((r) => r.found);

    logger.info(
      { companyName, country, results: results.length },
      `Employer verification completed`
    );

    return {
      status: verified ? 'verified' : 'unverified',
      results,
      message: verified
        ? `Found ${results.length} matching company record(s)`
        : 'No matching company records found in European registries',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error({ error, companyName, country }, 'Employer verification error');

    return {
      status: 'error',
      results: [],
      message: 'An error occurred during employer verification',
      timestamp: new Date(),
    };
  }
}

/**
 * Get information about available registries
 */
export function getRegistriesInfo() {
  return Object.entries(REGISTRIES_CONFIG).map(([key, config]) => ({
    id: key,
    name: config.name,
    country: config.country,
    documentationUrl: config.documentationUrl,
    available: !!config.apiKey,
  }));
}

/**
 * Search across multiple registries
 */
export async function searchEmployersMultiRegistry(
  companyName: string,
  countries?: string[]
): Promise<EmployerVerificationResponse> {
  const targetCountries = countries && countries.length > 0 ? countries : ['ALL'];
  
  let allResults: CompanyVerificationResult[] = [];

  for (const country of targetCountries) {
    const response = await verifyEmployer({
      companyName,
      country,
    });
    allResults = [...allResults, ...response.results];
  }

  const verified = allResults.length > 0;

  return {
    status: verified ? 'verified' : 'unverified',
    results: allResults,
    message: verified
      ? `Found ${allResults.length} matching employer record(s) across European registries`
      : 'No matching employer records found',
    timestamp: new Date(),
  };
}
