/**
 * Visa Simulator Routes
 * Calculate visa success probability using rules-based scoring
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

const simulatorInputSchema = z.object({
    visaType: z.string(),
    age: z.number().int().min(18).max(100),
    education: z.enum(["high_school", "bachelors", "masters", "phd"]),
    englishLevel: z.enum(["none", "basic", "intermediate", "advanced", "native"]),
    workExperience: z.number().int().min(0).max(50),
    jobOffer: z.boolean(),
    salary: z.number().optional(),
    funds: z.number(),
    country: z.string().length(2),
});

interface SimulatorFactor {
    factor: string;
    points: number;
    weight: number;
}

interface SimulatorResult {
    score: number;
    probability: number;
    factors: SimulatorFactor[];
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
}

// Scoring logic for Skilled Worker visa
function scoreSkilledWorker(input: z.infer<typeof simulatorInputSchema>): SimulatorResult {
    const factors: SimulatorFactor[] = [];
    let totalScore = 0;

    // Age points (max 25)
    let agePoints = 0;
    if (input.age >= 18 && input.age <= 25) agePoints = 25;
    else if (input.age <= 32) agePoints = 20;
    else if (input.age <= 39) agePoints = 15;
    else if (input.age <= 45) agePoints = 10;
    else agePoints = 5;
    factors.push({ factor: "Age", points: agePoints, weight: 0.2 });
    totalScore += agePoints;

    // Education points (max 25)
    const eduPoints = {
        phd: 25,
        masters: 20,
        bachelors: 15,
        high_school: 5,
    }[input.education];
    factors.push({ factor: "Education", points: eduPoints, weight: 0.25 });
    totalScore += eduPoints;

    // English level (max 20)
    const engPoints = {
        native: 20,
        advanced: 18,
        intermediate: 12,
        basic: 6,
        none: 0,
    }[input.englishLevel];
    factors.push({ factor: "English Proficiency", points: engPoints, weight: 0.2 });
    totalScore += engPoints;

    // Work experience (max 15)
    const expPoints = Math.min(input.workExperience * 3, 15);
    factors.push({ factor: "Work Experience", points: expPoints, weight: 0.15 });
    totalScore += expPoints;

    // Job offer (max 10)
    const jobPoints = input.jobOffer ? 10 : 0;
    factors.push({ factor: "Job Offer", points: jobPoints, weight: 0.1 });
    totalScore += jobPoints;

    // Funds (max 5)
    const fundsPoints = input.funds >= 15000 ? 5 : Math.floor(input.funds / 3000);
    factors.push({ factor: "Financial Capacity", points: fundsPoints, weight: 0.1 });
    totalScore += fundsPoints;

    const probability = Math.min(totalScore, 100);

    // Generate recommendations
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (eduPoints >= 20) strengths.push("Strong educational background");
    else if (eduPoints < 15) {
        weaknesses.push("Limited educational qualifications");
        recommendations.push("Consider pursuing higher education to improve score");
    }

    if (engPoints >= 18) strengths.push("Excellent English proficiency");
    else if (engPoints < 12) {
        weaknesses.push("English language skills need improvement");
        recommendations.push("Take IELTS/TOEFL preparation course to boost score");
    }

    if (!input.jobOffer) {
        weaknesses.push("No job offer secured");
        recommendations.push("Obtain Certificate of Sponsorship from UK employer");
    } else {
        strengths.push("Valid job offer from sponsor");
    }

    if (expPoints < 10) {
        weaknesses.push("Limited work experience");
        recommendations.push("Gain more relevant work experience in your field");
    } else {
        strengths.push("Good professional experience");
    }

    if (fundsPoints < 5) {
        recommendations.push("Build up savings to meet financial requirements (£15,000+)");
    }

    return {
        score: totalScore,
        probability,
        factors,
        recommendations,
        strengths,
        weaknesses,
    };
}

// Main simulator endpoint
router.post(
    "/calculate",
    authenticate,
    asyncHandler(async (req, res) => {
        const input = simulatorInputSchema.parse(req.body);

        logger.info({ userId: req.user!.userId, visaType: input.visaType }, "Simulator calculation");

        let result: SimulatorResult;

        // Use visa-specific scoring logic
        switch (input.visaType.toLowerCase()) {
            case "skilled worker":
            case "uk skilled worker":
                result = scoreSkilledWorker(input);
                break;

            // Can add more visa types here
            default:
                result = scoreSkilledWorker(input); // Default to skilled worker logic
        }

        res.json({
            ...result,
            message: result.probability >= 70
                ? "Strong chance of approval"
                : result.probability >= 50
                    ? "Moderate chance - improvements recommended"
                    : "Limited chance - significant improvements needed",
        });
    })
);

export default router;
