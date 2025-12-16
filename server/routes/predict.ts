import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const router = Router();

// Visa success prediction based on applicant profile
// Uses weighted scoring algorithm based on historical approval factors

interface PredictionFactors {
    age: number;
    education: string;
    workExperience: number;
    languageProficiency: string;
    hasJobOffer: boolean;
    salary?: number;
    visaType: string;
    country: string;
    hasFinancialProof: boolean;
    hasFamilyTies?: boolean;
    previousVisaRejections: number;
    criminalRecord: boolean;
}

interface PredictionResult {
    probability: number; // 0-100
    confidence: "low" | "medium" | "high";
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskFactors: string[];
    estimatedProcessingTime: string;
    requiredDocuments: string[];
}

// Scoring weights based on common visa approval criteria
const SCORING_WEIGHTS = {
    // Age scoring (18-35 optimal for most skilled worker visas)
    age: {
        '18-25': 20,
        '26-30': 25,
        '31-35': 20,
        '36-40': 15,
        '41-45': 10,
        '46+': 5,
    },
    // Education scoring
    education: {
        'phd': 30,
        'masters': 25,
        'bachelors': 20,
        'associate': 12,
        'diploma': 10,
        'high_school': 5,
        'other': 3,
    },
    // Work experience (years)
    workExperience: {
        '10+': 25,
        '5-9': 20,
        '3-4': 15,
        '1-2': 10,
        '0': 3,
    },
    // Language proficiency
    language: {
        'c2': 20,
        'c1': 18,
        'b2': 15,
        'b1': 10,
        'a2': 5,
        'a1': 2,
        'none': 0,
    },
    // Other factors
    jobOffer: 25,
    financialProof: 15,
    noRejections: 10,
    noCriminalRecord: 10,
};

// Country-specific requirements
const COUNTRY_REQUIREMENTS: Record<string, { minSalary?: number; pointsThreshold?: number; documents: string[] }> = {
    uk: {
        minSalary: 26200,
        pointsThreshold: 70,
        documents: [
            'Valid passport',
            'Certificate of Sponsorship',
            'Proof of English proficiency (IELTS/equivalent)',
            'Bank statements (last 3 months)',
            'Tuberculosis test results (if applicable)',
        ],
    },
    germany: {
        documents: [
            'Valid passport',
            'Recognized qualification certificate',
            'Job offer/employment contract',
            'Proof of German/English proficiency',
            'Health insurance proof',
            'Financial means proof (€1,027/month)',
        ],
    },
    usa: {
        documents: [
            'Valid passport',
            'DS-160 confirmation',
            'I-129 petition approval',
            'Educational credentials',
            'Employment verification',
            'Financial documents',
        ],
    },
    canada: {
        pointsThreshold: 67,
        documents: [
            'Valid passport',
            'Educational Credential Assessment (ECA)',
            'Language test results (IELTS/CELPIP)',
            'Proof of funds',
            'Police certificates',
            'Medical examination',
        ],
    },
    australia: {
        pointsThreshold: 65,
        documents: [
            'Valid passport',
            'Skills assessment',
            'English test results',
            'Health examination',
            'Police clearances',
            'Proof of funds',
        ],
    },
};

function getAgeScore(age: number): number {
    if (age >= 18 && age <= 25) return SCORING_WEIGHTS.age['18-25'];
    if (age >= 26 && age <= 30) return SCORING_WEIGHTS.age['26-30'];
    if (age >= 31 && age <= 35) return SCORING_WEIGHTS.age['31-35'];
    if (age >= 36 && age <= 40) return SCORING_WEIGHTS.age['36-40'];
    if (age >= 41 && age <= 45) return SCORING_WEIGHTS.age['41-45'];
    return SCORING_WEIGHTS.age['46+'];
}

function getEducationScore(education: string): number {
    const key = education.toLowerCase().replace(/[^a-z]/g, '');
    if (key.includes('phd') || key.includes('doctorate')) return SCORING_WEIGHTS.education.phd;
    if (key.includes('master')) return SCORING_WEIGHTS.education.masters;
    if (key.includes('bachelor')) return SCORING_WEIGHTS.education.bachelors;
    if (key.includes('associate')) return SCORING_WEIGHTS.education.associate;
    if (key.includes('diploma') || key.includes('vocational')) return SCORING_WEIGHTS.education.diploma;
    if (key.includes('high') || key.includes('secondary')) return SCORING_WEIGHTS.education.high_school;
    return SCORING_WEIGHTS.education.other;
}

function getExperienceScore(years: number): number {
    if (years >= 10) return SCORING_WEIGHTS.workExperience['10+'];
    if (years >= 5) return SCORING_WEIGHTS.workExperience['5-9'];
    if (years >= 3) return SCORING_WEIGHTS.workExperience['3-4'];
    if (years >= 1) return SCORING_WEIGHTS.workExperience['1-2'];
    return SCORING_WEIGHTS.workExperience['0'];
}

function getLanguageScore(proficiency: string): number {
    const key = proficiency.toLowerCase();
    if (key.includes('c2') || key.includes('native') || key.includes('fluent')) return SCORING_WEIGHTS.language.c2;
    if (key.includes('c1') || key.includes('advanced')) return SCORING_WEIGHTS.language.c1;
    if (key.includes('b2') || key.includes('upper')) return SCORING_WEIGHTS.language.b2;
    if (key.includes('b1') || key.includes('intermediate')) return SCORING_WEIGHTS.language.b1;
    if (key.includes('a2') || key.includes('elementary')) return SCORING_WEIGHTS.language.a2;
    if (key.includes('a1') || key.includes('basic')) return SCORING_WEIGHTS.language.a1;
    return SCORING_WEIGHTS.language.none;
}

function calculatePrediction(factors: PredictionFactors): PredictionResult {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    let totalScore = 0;
    const maxScore = 150; // Maximum possible score

    // Age scoring
    const ageScore = getAgeScore(factors.age);
    totalScore += ageScore;
    if (ageScore >= 20) {
        strengths.push(`Optimal age range (${factors.age} years)`);
    } else if (ageScore <= 10) {
        weaknesses.push('Age may reduce points in points-based systems');
        recommendations.push('Consider fast-track visa options that don\'t penalize age');
    }

    // Education scoring
    const eduScore = getEducationScore(factors.education);
    totalScore += eduScore;
    if (eduScore >= 25) {
        strengths.push(`Strong educational background (${factors.education})`);
    } else if (eduScore <= 10) {
        weaknesses.push('Limited formal education credentials');
        recommendations.push('Consider credential evaluation services for recognition');
    }

    // Work experience scoring
    const expScore = getExperienceScore(factors.workExperience);
    totalScore += expScore;
    if (expScore >= 20) {
        strengths.push(`Extensive work experience (${factors.workExperience} years)`);
    } else if (expScore <= 10) {
        weaknesses.push('Limited work experience');
        recommendations.push('Highlight any internships, projects, or relevant activities');
    }

    // Language proficiency
    const langScore = getLanguageScore(factors.languageProficiency);
    totalScore += langScore;
    if (langScore >= 15) {
        strengths.push(`Strong language proficiency (${factors.languageProficiency})`);
    } else if (langScore <= 10) {
        weaknesses.push('Language proficiency could be improved');
        recommendations.push('Consider taking an official language test (IELTS, TOEFL, etc.)');
    }

    // Job offer
    if (factors.hasJobOffer) {
        totalScore += SCORING_WEIGHTS.jobOffer;
        strengths.push('Has confirmed job offer');
    } else {
        weaknesses.push('No job offer in destination country');
        recommendations.push('Apply for jobs with visa sponsorship capability');
    }

    // Financial proof
    if (factors.hasFinancialProof) {
        totalScore += SCORING_WEIGHTS.financialProof;
        strengths.push('Can demonstrate financial stability');
    } else {
        riskFactors.push('Insufficient financial documentation');
        recommendations.push('Prepare bank statements showing stable funds');
    }

    // Previous rejections
    if (factors.previousVisaRejections === 0) {
        totalScore += SCORING_WEIGHTS.noRejections;
        strengths.push('Clean visa application history');
    } else {
        const penalty = Math.min(factors.previousVisaRejections * 10, 30);
        totalScore -= penalty;
        riskFactors.push(`Previous visa rejection(s): ${factors.previousVisaRejections}`);
        recommendations.push('Address previous rejection reasons in new application');
    }

    // Criminal record
    if (!factors.criminalRecord) {
        totalScore += SCORING_WEIGHTS.noCriminalRecord;
    } else {
        riskFactors.push('Criminal record may affect eligibility');
        recommendations.push('Consult with immigration lawyer about disclosure requirements');
    }

    // Salary check for UK
    const country = factors.country.toLowerCase();
    const countryReqs = COUNTRY_REQUIREMENTS[country];
    if (countryReqs?.minSalary && factors.salary) {
        if (factors.salary >= countryReqs.minSalary) {
            strengths.push(`Salary meets threshold (${factors.salary.toLocaleString()} ≥ ${countryReqs.minSalary.toLocaleString()})`);
        } else {
            riskFactors.push(`Salary below minimum requirement (${factors.salary.toLocaleString()} < ${countryReqs.minSalary.toLocaleString()})`);
        }
    }

    // Calculate probability
    const rawProbability = Math.round((totalScore / maxScore) * 100);
    const probability = Math.min(Math.max(rawProbability, 5), 95); // Clamp between 5-95%

    // Determine confidence
    let confidence: "low" | "medium" | "high";
    if (riskFactors.length >= 3 || probability < 40) {
        confidence = "low";
    } else if (riskFactors.length >= 1 || probability < 70) {
        confidence = "medium";
    } else {
        confidence = "high";
    }

    // Estimated processing time based on visa type and country
    const processingTimes: Record<string, Record<string, string>> = {
        uk: { skilled_worker: '3-8 weeks', student: '3-4 weeks', family: '12-24 weeks' },
        germany: { work: '4-12 weeks', opportunity_card: '4-8 weeks', student: '4-6 weeks' },
        usa: { h1b: '6-9 months', f1: '2-4 months', b1b2: '3-6 weeks' },
        canada: { express_entry: '6-12 months', study: '8-16 weeks' },
        australia: { skilled: '6-12 months', student: '4-6 weeks' },
    };
    const visaKey = factors.visaType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const estimatedProcessingTime = processingTimes[country]?.[visaKey] || '4-12 weeks';

    // Required documents
    const requiredDocuments = countryReqs?.documents || [
        'Valid passport (6+ months validity)',
        'Completed visa application form',
        'Recent passport photographs',
        'Proof of financial means',
        'Educational certificates',
        'Work experience letters',
    ];

    return {
        probability,
        confidence,
        strengths,
        weaknesses,
        recommendations,
        riskFactors,
        estimatedProcessingTime,
        requiredDocuments,
    };
}

// Input validation schema
const predictionSchema = z.object({
    age: z.number().min(18).max(80),
    education: z.string().min(1),
    workExperience: z.number().min(0).max(50),
    languageProficiency: z.string().min(1),
    hasJobOffer: z.boolean(),
    salary: z.number().optional(),
    visaType: z.string().min(1),
    country: z.string().min(1),
    hasFinancialProof: z.boolean(),
    hasFamilyTies: z.boolean().optional(),
    previousVisaRejections: z.number().min(0).default(0),
    criminalRecord: z.boolean().default(false),
});

// Prediction endpoint
router.post(
    "/visa-success",
    authenticate,
    asyncHandler(async (req, res) => {
        const factors = predictionSchema.parse(req.body);

        logger.info({ userId: req.user?.userId, country: factors.country, visaType: factors.visaType }, "Visa success prediction requested");

        const result = calculatePrediction(factors);

        // Log prediction for analytics
        logger.info({
            userId: req.user?.userId,
            probability: result.probability,
            confidence: result.confidence,
            country: factors.country,
            visaType: factors.visaType,
        }, "Visa prediction completed");

        res.json({
            success: true,
            prediction: result,
            factors: {
                country: factors.country,
                visaType: factors.visaType,
                age: factors.age,
                education: factors.education,
                experience: factors.workExperience,
            },
        });
    })
);

// Quick prediction endpoint (simplified)
router.post(
    "/quick-assessment",
    authenticate,
    asyncHandler(async (req, res) => {
        const { country, visaType, hasJobOffer, education, experience } = z.object({
            country: z.string(),
            visaType: z.string(),
            hasJobOffer: z.boolean(),
            education: z.string(),
            experience: z.number(),
        }).parse(req.body);

        // Simplified scoring
        let score = 50; // Base score
        if (hasJobOffer) score += 20;
        if (experience >= 5) score += 15;
        else if (experience >= 2) score += 10;

        const eduLower = education.toLowerCase();
        if (eduLower.includes('master') || eduLower.includes('phd')) score += 15;
        else if (eduLower.includes('bachelor')) score += 10;

        const probability = Math.min(score, 95);

        res.json({
            success: true,
            probability,
            assessment: probability >= 70 ? 'Strong candidate' : probability >= 50 ? 'Good potential' : 'Needs improvement',
            nextStep: hasJobOffer ? 'Gather required documents' : 'Focus on job search with sponsorship',
        });
    })
);

export default router;
