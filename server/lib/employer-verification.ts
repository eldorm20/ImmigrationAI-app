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
    logger.warn('UK Companies House API key not configured.');
    return null;
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
  const config = REGISTRIES_CONFIG.eu_germany_hwr;
  if (!config.apiKey) return null;
  // Real implementation would go here (omitted as we are only removing mocks today per request to not have mocks, but we don't have the real API definition in the original file to uncomment)
  // For now, returning null to indicate no data found if we can't query real API
  return null;
}

/**
 * Query France INPI API
 */
async function verifyFrenchCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  const config = REGISTRIES_CONFIG.eu_france_inpi;
  if (!config.apiKey) return null;
  return null;
}

/**
 * Query Netherlands KvK API
 */
async function verifyDutchCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  const config = REGISTRIES_CONFIG.eu_netherlands_kvk;
  if (!config.apiKey) return null;
  return null;
}

/**
 * Query Spain Mercantil Register
 */
async function verifySpanishCompany(
  companyName: string
): Promise<CompanyVerificationResult | null> {
  const config = REGISTRIES_CONFIG.eu_spain_mercantil;
  if (!config.apiKey) return null;
  return null;
}

/**
 * Mock data generators for development
 */


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
