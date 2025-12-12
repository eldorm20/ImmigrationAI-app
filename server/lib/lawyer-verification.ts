import { db } from "../db";
import { logger } from "./logger";

export interface LawyerCredential {
  lawyerId: string;
  licenseNumber: string;
  jurisdiction: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface LawyerRating {
  ratingId: string;
  lawyerId: string;
  userId: string;
  rating: number; // 1-5
  review: string;
  categories: {
    communication: number;
    expertise: number;
    responsiveness: number;
    professionalism: number;
  };
  createdAt: Date;
}

export interface LawyerProfile {
  lawyerId: string;
  name: string;
  email: string;
  phone: string;
  specializations: string[];
  languages: string[];
  hourlyRate: number;
  totalConsultations: number;
  averageRating: number;
  credentials: LawyerCredential[];
  reviews: LawyerRating[];
  responseTime: number; // in hours
  verified: boolean;
}

// Verify lawyer credentials (simulated - would integrate with bar association APIs)
export async function verifyLawyerCredentials(
  lawyerId: string,
  licenseNumber: string,
  jurisdiction: string
): Promise<LawyerCredential | null> {
  try {
    logger.info({ lawyerId, jurisdiction }, "Starting lawyer credential verification");

    // Simulated verification - in production, check against official bar associations
    const isValid = validateLicenseFormat(licenseNumber, jurisdiction);

    if (!isValid) {
      logger.warn({ lawyerId, licenseNumber }, "Invalid license format");
      return null;
    }

    const credential: LawyerCredential = {
      lawyerId,
      licenseNumber,
      jurisdiction,
      verificationStatus: "verified",
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    };

    logger.info({ lawyerId }, "Lawyer credentials verified");
    return credential;
  } catch (error) {
    logger.error({ error, lawyerId }, "Failed to verify lawyer credentials");
    return null;
  }
}

// Validate license format by jurisdiction
function validateLicenseFormat(license: string, jurisdiction: string): boolean {
  const formats: Record<string, RegExp> = {
    "UK": /^[A-Z]{1,3}\d{4,6}$/,
    "USA": /^\d{5,7}$/,
    "Canada": /^[A-Z]{2}\d{6}$/,
    "AU": /^[A-Z]\d{6}$/,
  };

  const pattern = formats[jurisdiction] || /.+/;
  return pattern.test(license);
}

// Add rating for lawyer
export async function addLawyerRating(
  lawyerId: string,
  userId: string,
  rating: LawyerRating
): Promise<boolean> {
  try {
    // Validate rating
    if (rating.rating < 1 || rating.rating > 5) {
      logger.warn({ lawyerId, rating: rating.rating }, "Invalid rating score");
      return false;
    }

    Object.values(rating.categories).forEach((cat) => {
      if (cat < 1 || cat > 5) {
        throw new Error("Invalid category rating");
      }
    });

    logger.info({ lawyerId, userId }, "Rating added for lawyer");
    return true;
  } catch (error) {
    logger.error({ error, lawyerId }, "Failed to add lawyer rating");
    return false;
  }
}

// Get lawyer's average rating
export function calculateAverageRating(ratings: LawyerRating[]): number {
  if (ratings.length === 0) return 0;
  const total = ratings.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / ratings.length) * 10) / 10;
}

// Get lawyer category ratings
export function calculateCategoryRatings(
  ratings: LawyerRating[]
): Record<string, number> {
  if (ratings.length === 0) {
    return {
      communication: 0,
      expertise: 0,
      responsiveness: 0,
      professionalism: 0,
    };
  }

  const sums = {
    communication: 0,
    expertise: 0,
    responsiveness: 0,
    professionalism: 0,
  };

  ratings.forEach((r) => {
    sums.communication += r.categories.communication;
    sums.expertise += r.categories.expertise;
    sums.responsiveness += r.categories.responsiveness;
    sums.professionalism += r.categories.professionalism;
  });

  const count = ratings.length;
  return {
    communication: Math.round((sums.communication / count) * 10) / 10,
    expertise: Math.round((sums.expertise / count) * 10) / 10,
    responsiveness: Math.round((sums.responsiveness / count) * 10) / 10,
    professionalism: Math.round((sums.professionalism / count) * 10) / 10,
  };
}

// Search and filter lawyers
export async function searchLawyers(
  filters: {
    specializations?: string[];
    languages?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    verifiedOnly?: boolean;
  },
  lawyers: LawyerProfile[]
): Promise<LawyerProfile[]> {
  try {
    return lawyers.filter((lawyer) => {
      // Specialization filter
      if (filters.specializations && filters.specializations.length > 0) {
        const hasSpecialization = filters.specializations.some((spec) =>
          lawyer.specializations.includes(spec)
        );
        if (!hasSpecialization) return false;
      }

      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        const hasLanguage = filters.languages.some((lang) =>
          lawyer.languages.includes(lang)
        );
        if (!hasLanguage) return false;
      }

      // Rating filter
      if (filters.minRating && lawyer.averageRating < filters.minRating) {
        return false;
      }

      // Price filter
      if (filters.maxHourlyRate && lawyer.hourlyRate > filters.maxHourlyRate) {
        return false;
      }

      // Verification filter
      if (filters.verifiedOnly && !lawyer.verified) {
        return false;
      }

      return true;
    });
  } catch (error) {
    logger.error({ error }, "Failed to search lawyers");
    return [];
  }
}

// Get lawyer recommendation score
export function getLawyerScore(lawyer: LawyerProfile): number {
  let score = 0;

  // Rating component (40%)
  score += (lawyer.averageRating / 5) * 40;

  // Specializations component (30%)
  score += Math.min(lawyer.specializations.length * 10, 30);

  // Response time component (20%)
  const responseScore = Math.max(20 - lawyer.responseTime / 12, 0); // Decreases with response time
  score += Math.min(responseScore, 20);

  // Verification bonus (10%)
  if (lawyer.verified) {
    score += 10;
  }

  return Math.round(score);
}

// Sort lawyers by relevance
export function sortLawyersByRelevance(
  lawyers: LawyerProfile[],
  preferences?: Record<string, any>
): LawyerProfile[] {
  return lawyers.sort((a, b) => {
    const scoreA = getLawyerScore(a);
    const scoreB = getLawyerScore(b);
    return scoreB - scoreA;
  });
}

// Get lawyer statistics
export async function getLawyerStatistics(lawyerId: string, lawyer: LawyerProfile) {
  return {
    lawyerId,
    name: lawyer.name,
    verified: lawyer.verified,
    rating: lawyer.averageRating,
    totalReviews: lawyer.reviews.length,
    totalConsultations: lawyer.totalConsultations,
    specializations: lawyer.specializations,
    responseTime: `${lawyer.responseTime} hours`,
    hourlyRate: `$${lawyer.hourlyRate}`,
    categoryRatings: calculateCategoryRatings(lawyer.reviews),
  };
}
