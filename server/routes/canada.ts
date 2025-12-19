import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Calculate Canada CRS (Comprehensive Ranking System) score
router.post(
    "/assessment/canada/crs-score",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const {
            nocCode,
            age,
            englishLevel, // CLB score (0-12)
            frenchLevel, // CLB score (0-12)
            educationLevel, // 'High School', 'Bachelor', 'Masters', 'PhD'
            canadianEducation, // boolean
            yearsExperience, // Total work experience
            canadianExperience, // Canadian work experience (years)
            maritalStatus, // 'single', 'married'
            spouseEducation, // If married
            spouseLanguage // If married
        } = req.body;

        // Validate required fields
        if (!nocCode || age === undefined || !englishLevel || !educationLevel || yearsExperience === undefined) {
            throw new AppError(400, "Missing required fields: nocCode, age, englishLevel, educationLevel, yearsExperience");
        }

        // Verify NOC code exists (optional - for better UX)
        // Note: Using raw SQL until schema is fully integrated
        try {
            const nocResult = await db.execute(sql`
        SELECT noc_code, noc_title FROM express_entry_requirements 
        WHERE noc_code = ${nocCode}
        LIMIT 1
      `);

            if (!nocResult.rows || nocResult.rows.length === 0) {
                logger.warn({ nocCode, userId }, "NOC code not found in database");
            }
        } catch (err) {
            logger.warn({ error: err, nocCode }, "Failed to verify NOC code");
        }

        // Calculate CRS score
        const crsScore = calculateCRSScore({
            age,
            englishLevel: parseInt(englishLevel),
            frenchLevel: frenchLevel ? parseInt(frenchLevel) : 0,
            educationLevel,
            canadianEducation: canadianEducation || false,
            yearsExperience,
            canadianExperience: canadianExperience || 0,
            maritalStatus: maritalStatus || 'single',
            spouseEducation,
            spouseLanguage
        });

        // Current Express Entry cutoff (as of Dec 2024)
        const currentCutoff = 546; // Updates regularly - should be configurable
        const eligible = crsScore >= currentCutoff;

        // Save assessment to database
        try {
            await db.execute(`
        UPDATE user_assessments 
        SET canada_crs_score = ${crsScore},
            canada_express_entry_eligible = ${eligible},
            canada_assessment_data = '${JSON.stringify({
                nocCode,
                age,
                englishLevel,
                frenchLevel,
                educationLevel,
                yearsExperience,
                calculatedAt: new Date().toISOString()
            })}'::jsonb,
            updated_at = NOW()
        WHERE user_id = '${userId}'
      `);
        } catch (dbError) {
            // Non-fatal - log but continue
            logger.warn({ error: dbError, userId }, "Failed to save CRS assessment to database");
        }

        // Generate recommendations
        const recommendations = generateCRSRecommendations(crsScore, currentCutoff, {
            englishLevel: parseInt(englishLevel),
            frenchLevel: frenchLevel ? parseInt(frenchLevel) : 0,
            educationLevel,
            canadianEducation: canadianEducation || false,
            canadianExperience: canadianExperience || 0
        });

        res.json({
            crsScore,
            eligible,
            cutoff: currentCutoff,
            pointsNeeded: eligible ? 0 : currentCutoff - crsScore,
            estimatedWaitTime: eligible ? '3-6 months' : 'Not currently eligible',
            breakdown: {
                age: calculateAgePoints(age, maritalStatus === 'married'),
                language: calculateLanguagePoints(parseInt(englishLevel), frenchLevel ? parseInt(frenchLevel) : 0, maritalStatus === 'married'),
                education: calculateEducationPoints(educationLevel, canadianEducation, maritalStatus === 'married'),
                experience: calculateExperiencePoints(yearsExperience, canadianExperience)
            },
            recommendations,
            nextSteps: eligible ?
                ['Create Express Entry profile on IRCC website', 'Wait for Invitation to Apply (ITA)', 'Prepare documents for full application'] :
                recommendations.slice(0, 3) // Top 3 recommendations
        });
    })
);

// Check PNP (Provincial Nominee Program) eligibility
router.post(
    "/assessment/canada/pnp-eligibility",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { nocCode, crsScore } = req.body;

        if (!nocCode) {
            throw new AppError(400, "NOC code is required");
        }

        // Find provinces that prioritize this occupation
        const provincesResult = await db.execute(sql`
      SELECT province_code, province_name, min_points, processing_days, description
      FROM canada_pnp_provinces
      WHERE ${nocCode} = ANY(priority_occupations)
    `);

        const eligibleProvinces = provincesResult.rows || [];

        const pnpRecommendations = eligibleProvinces.map((province: any) => ({
            provinceCode: province.province_code,
            provinceName: province.province_name,
            minPoints: province.min_points,
            processingDays: province.processing_days,
            eligible: crsScore ? crsScore + 600 >= 546 : null, // PNP adds 600 points
            description: province.description
        }));

        res.json({
            eligibleProvinces: pnpRecommendations.length,
            provinces: pnpRecommendations,
            pnpBonus: 600,
            projectedCRS: crsScore ? crsScore + 600 : null
        });
    })
);

// Search NOC codes
router.get(
    "/assessment/canada/noc-lookup",
    asyncHandler(async (req, res) => {
        const { search } = req.query;

        if (!search || (search as string).length < 2) {
            throw new AppError(400, "Search query must be at least 2 characters");
        }

        const searchPattern = `%${search}%`;

        const nocResult = await db.execute(sql`
      SELECT noc_code, noc_title, min_clb_score, min_education_level, 
             preferred_experience_years, in_demand
      FROM express_entry_requirements
      WHERE noc_code ILIKE ${searchPattern} 
         OR noc_title ILIKE ${searchPattern}
      ORDER BY in_demand DESC, noc_code ASC
      LIMIT 20
    `);

        res.json({ results: nocResult.rows || [] });
    })
);

export default router;

//  === Helper Functions ===

function calculateCRSScore(profile: any): number {
    let score = 0;
    const married = profile.maritalStatus === 'married';

    // Age points (max: 100 single, 110 married)
    score += calculateAgePoints(profile.age, married);

    // Language points (max: 128 single, 150 married for first language)
    score += calculateLanguagePoints(profile.englishLevel, profile.frenchLevel, married);

    // Education points (max: 140 single, 150 married)
    score += calculateEducationPoints(profile.educationLevel, profile.canadianEducation, married);

    // Work experience points (max: 70 single, 80 married)
    score += calculateExperiencePoints(profile.yearsExperience, profile.canadianExperience);

    // Spouse points (if married)
    if (married && profile.spouseEducation) {
        score += calculateSpousePoints(profile.spouseEducation, profile.spouseLanguage);
    }

    return Math.min(score, 1200); // Max CRS is 1200
}

function calculateAgePoints(age: number, married: boolean): number {
    const maxPoints = married ? 110 : 100;

    if (age >= 18 && age <= 19) return maxPoints * 0.99;
    if (age >= 20 && age <= 29) return maxPoints;
    if (age >= 30 && age <= 34) return maxPoints * 0.95;
    if (age >= 35 && age <= 39) return maxPoints * 0.85;
    if (age >= 40 && age <= 44) return maxPoints * 0.50;
    if (age >= 45) return 0;

    return 0;
}

function calculateLanguagePoints(englishCLB: number, frenchCLB: number, married: boolean): number {
    const maxFirstLanguage = married ? 128 : 150;
    const maxSecondLanguage = 24;

    let firstLang = 0;
    let secondLang = 0;

    // First language (English or French - whichever is higher)
    const primaryCLB = Math.max(englishCLB, frenchCLB);

    if (primaryCLB >= 9) firstLang = maxFirstLanguage;
    else if (primaryCLB >= 7) firstLang = maxFirstLanguage * 0.8;
    else if (primaryCLB >= 5) firstLang = maxFirstLanguage * 0.3;

    // Second language bonus
    if (englishCLB >= 5 && frenchCLB >= 5) {
        secondLang = maxSecondLanguage;
    }

    return Math.round(firstLang + secondLang);
}

function calculateEducationPoints(level: string, canadianEd: boolean, married: boolean): number {
    const maxPoints = married ? 140 : 150;

    let basePoints = 0;

    if (level === 'PhD') basePoints = maxPoints;
    else if (level === 'Masters') basePoints = maxPoints * 0.9;
    else if (level === 'Bachelor') basePoints = maxPoints * 0.7;
    else if (level === 'Diploma' || level === 'College') basePoints = maxPoints * 0.5;
    else if (level === 'High School') basePoints = maxPoints * 0.2;

    // Canadian education bonus
    if (canadianEd) {
        basePoints += 30;
    }

    return Math.round(basePoints);
}

function calculateExperiencePoints(totalYears: number, canadianYears: number): number {
    let foreignPoints = 0;
    let canadianPoints = 0;

    // Foreign experience (max: 50)
    if (totalYears >= 6) foreignPoints = 50;
    else if (totalYears >= 4) foreignPoints = 25;
    else if (totalYears >= 2) foreignPoints = 13;
    else if (totalYears >= 1) foreignPoints = 7;

    // Canadian experience (max: 80)
    if (canadianYears >= 5) canadianPoints = 80;
    else if (canadianYears >= 3) canadianPoints = 46;
    else if (canadianYears >= 2) canadianPoints = 35;
    else if (canadianYears >= 1) canadianPoints = 9;

    return foreignPoints + canadianPoints;
}

function calculateSpousePoints(education: string, language: number): number {
    let points = 0;

    // Spouse education (max: 10)
    if (education === 'PhD' || education === 'Masters') points += 10;
    else if (education === 'Bachelor') points += 8;
    else if (education === 'Diploma') points += 6;

    // Spouse language (max: 20)
    if (language >= 7) points += 20;
    else if (language >= 5) points += 10;

    return points;
}

function generateCRSRecommendations(crsScore: number, cutoff: number, profile: any): string[] {
    const recommendations: string[] = [];

    if (crsScore >= cutoff) {
        recommendations.push("You are eligible for Express Entry! Create your profile on IRCC website.");
        return recommendations;
    }

    const gap = cutoff - crsScore;

    // Language improvement
    if (profile.englishLevel < 9) {
        recommendations.push(`Improve English to CLB 9 (IELTS 7.0+) - can add up to 50 points`);
    }

    if (!profile.frenchLevel || profile.frenchLevel < 5) {
        recommendations.push(`Learn French to CLB 5+ - adds up to 24 bonus points`);
    }

    // Education improvement
    if (!profile.canadianEducation && (profile.educationLevel === 'Bachelor' || profile.educationLevel === 'Masters')) {
        recommendations.push(`Consider 1-year Canadian Masters program - adds 30 points + Canadian education bonus`);
    }

    // Canadian experience
    if (profile.canadianExperience === 0) {
        recommendations.push(`Gain Canadian work experience (1 year min) - adds up to 80 points`);
    }

    // PNP option
    recommendations.push(`Apply for Provincial Nominee Program (PNP) - adds 600 points guaranteed`);

    // Job offer
    recommendations.push(`Secure a Canadian job offer with LMIA - adds 50-200 points`);

    return recommendations.slice(0, 5); // Top 5 recommendations
}
