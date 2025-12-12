import { db } from "../db";
import { logger } from "./logger";

export interface VisaRequirement {
  visaType: string;
  country: string;
  documents: string[];
  fees: number;
  processingTime: string;
  successRate: number;
  lastUpdated: Date;
  source: string;
}

export interface TravelAdvisory {
  country: string;
  level: "low" | "moderate" | "high" | "critical";
  description: string;
  affectedVisaTypes: string[];
  lastUpdated: Date;
}

// Visa requirement data (in production, fetch from external sources)
const VISA_DATABASE: Record<string, VisaRequirement[]> = {
  "UK": [
    {
      visaType: "Skilled Worker Visa",
      country: "UK",
      documents: ["Passport", "Job Offer Letter", "Qualification Certificates", "TB Test"],
      fees: 719,
      processingTime: "8 weeks",
      successRate: 95,
      lastUpdated: new Date(),
      source: "UK Home Office",
    },
    {
      visaType: "Student Visa",
      country: "UK",
      documents: ["Passport", "University Offer", "Financial Documents", "Proof of Funds"],
      fees: 719,
      processingTime: "3 weeks",
      successRate: 98,
      lastUpdated: new Date(),
      source: "UK Home Office",
    },
  ],
  "Canada": [
    {
      visaType: "Express Entry",
      country: "Canada",
      documents: ["Passport", "Language Test", "Education Documents", "Work Experience"],
      fees: 850,
      processingTime: "6 months",
      successRate: 85,
      lastUpdated: new Date(),
      source: "Immigration, Refugees and Citizenship Canada",
    },
  ],
  "USA": [
    {
      visaType: "EB-2 Employment-Based",
      country: "USA",
      documents: ["Labor Certification", "Job Offer", "Degrees", "USCIS Forms"],
      fees: 465,
      processingTime: "2-3 years",
      successRate: 75,
      lastUpdated: new Date(),
      source: "USCIS",
    },
  ],
};

// Travel advisories (in production, fetch from government sources)
const TRAVEL_ADVISORIES: TravelAdvisory[] = [
  {
    country: "Afghanistan",
    level: "critical",
    description: "Avoid all travel due to armed conflict and security risks",
    affectedVisaTypes: ["Tourist", "Business", "Temporary Resident"],
    lastUpdated: new Date(),
  },
];

// Get visa requirements for a country
export async function getVisaRequirements(country: string): Promise<VisaRequirement[]> {
  try {
    const requirements = VISA_DATABASE[country] || [];
    logger.info({ country, count: requirements.length }, "Retrieved visa requirements");
    return requirements;
  } catch (error) {
    logger.error({ error, country }, "Failed to get visa requirements");
    return [];
  }
}

// Get specific visa type requirements
export async function getVisaTypeRequirements(
  country: string,
  visaType: string
): Promise<VisaRequirement | null> {
  try {
    const requirements = VISA_DATABASE[country] || [];
    return requirements.find((r) => r.visaType === visaType) || null;
  } catch (error) {
    logger.error({ error, country, visaType }, "Failed to get visa type requirements");
    return null;
  }
}

// Get travel advisory for a country
export async function getTravelAdvisory(country: string): Promise<TravelAdvisory | null> {
  try {
    return TRAVEL_ADVISORIES.find((a) => a.country === country) || null;
  } catch (error) {
    logger.error({ error, country }, "Failed to get travel advisory");
    return null;
  }
}

// Get all travel advisories
export async function getAllTravelAdvisories(): Promise<TravelAdvisory[]> {
  try {
    return TRAVEL_ADVISORIES;
  } catch (error) {
    logger.error({ error }, "Failed to get travel advisories");
    return [];
  }
}

// Check if visa type is affected by travel restrictions
export async function isVisaAffected(
  country: string,
  visaType: string
): Promise<boolean> {
  try {
    const advisory = await getTravelAdvisory(country);
    if (!advisory) return false;
    return advisory.affectedVisaTypes.includes(visaType);
  } catch (error) {
    logger.error({ error, country, visaType }, "Failed to check visa restriction");
    return false;
  }
}

// Compare visa requirements between countries
export async function compareVisas(
  countries: string[],
  visaType: string
): Promise<Record<string, VisaRequirement | null>> {
  const comparison: Record<string, VisaRequirement | null> = {};
  
  for (const country of countries) {
    comparison[country] = await getVisaTypeRequirements(country, visaType);
  }
  
  return comparison;
}

// Get visa statistics
export async function getVisaStatistics(country: string) {
  try {
    const requirements = await getVisaRequirements(country);
    const advisory = await getTravelAdvisory(country);

    return {
      country,
      totalVisaTypes: requirements.length,
      averageProcessingTime: calculateAverageTime(requirements),
      averageSuccessRate: calculateAverageSuccessRate(requirements),
      averageFee: calculateAverageFee(requirements),
      travelAdvisory: advisory?.level || "normal",
      mostCommonDocuments: getMostCommonDocuments(requirements),
    };
  } catch (error) {
    logger.error({ error, country }, "Failed to get visa statistics");
    return null;
  }
}

function calculateAverageTime(requirements: VisaRequirement[]): string {
  if (requirements.length === 0) return "N/A";
  // Simplified calculation - in production, parse time strings properly
  return `${Math.round(requirements.length * 8)} weeks`;
}

function calculateAverageSuccessRate(requirements: VisaRequirement[]): number {
  if (requirements.length === 0) return 0;
  const total = requirements.reduce((sum, r) => sum + r.successRate, 0);
  return Math.round(total / requirements.length);
}

function calculateAverageFee(requirements: VisaRequirement[]): number {
  if (requirements.length === 0) return 0;
  const total = requirements.reduce((sum, r) => sum + r.fees, 0);
  return Math.round(total / requirements.length);
}

function getMostCommonDocuments(requirements: VisaRequirement[]): string[] {
  if (requirements.length === 0) return [];
  const docCount: Record<string, number> = {};
  
  requirements.forEach((r) => {
    r.documents.forEach((doc) => {
      docCount[doc] = (docCount[doc] || 0) + 1;
    });
  });
  
  return Object.entries(docCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);
}
