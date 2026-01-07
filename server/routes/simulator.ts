import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { agentsManager } from "../lib/agents";
import { logger } from "../lib/logger";

const router = Router();

router.post(
    "/calculate",
    authenticate,
    asyncHandler(async (req, res) => {
        const inputs = req.body;

        // Construct the prompt for the AI
        const prompt = `Analyze the visa success probability for the following profile:
    - Visa Type: ${inputs.visaType} (Target Country: ${inputs.country})
    - Age: ${inputs.age}
    - Education: ${inputs.education}
    - English Level: ${inputs.englishLevel}
    - Work Experience: ${inputs.workExperience} years
    - Job Offer: ${inputs.jobOffer ? "Yes" : "No"}
    - Funds: ${inputs.funds}
    
    Return a JSON response with:
    - probability: number (0-100)
    - score: number (0-100, usually same as probability)
    - factors: array of objects { factor: string, points: number, weight: number }
    - strengths: array of strings
    - weaknesses: array of strings
    - recommendations: array of strings
    - message: string (summary conclusion)
    
    Be realistic. UK Skilled Worker requires Job Offer + English + Salary. Without Job Offer, probability is low (<30%).
    Student visa requires admission + funds.
    `;

        try {
            // Use the AI agent to generate the analysis
            const response = await agentsManager.processRequest(
                "immigration-specialist",
                "analyze_profile",
                [prompt]
            );

            if (response.success && response.data) {
                let data = response.data;
                // Ensure it's valid JSON if string
                if (typeof data === 'string') {
                    try {
                        // Try to extract JSON from markdown block if present
                        const jsonMatch = data.match(/```json\n([\s\S]*?)\n```/) || data.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                        } else {
                            data = JSON.parse(data);
                        }
                    } catch (e) {
                        logger.warn("Failed to parse AI response for simulator, falling back to logic");
                        // Fallback below
                        throw new Error("AI Parse Error");
                    }
                }
                return res.json(data);
            }

            throw new Error("AI Analysis Failed");

        } catch (error) {
            logger.error({ error }, "Simulator AI failed, using fallback logic");

            // Robust Fallback Logic (if AI fails)
            let score = 50;
            const strengths = [];
            const weaknesses = [];
            const recommendations = [];

            // Simple rules engine fallback
            if (inputs.jobOffer) {
                score += 30;
                strengths.push("Valid Job Offer/Sponsorship");
            } else {
                score -= 20;
                weaknesses.push("No Job Offer (Critical for Skilled Worker)");
                recommendations.push("Secure a job offer from a licensed sponsor");
            }

            if (inputs.englishLevel === 'native' || inputs.englishLevel === 'advanced') {
                score += 10;
                strengths.push("Strong English Proficiency");
            }

            if (inputs.funds < 1270 && inputs.visaType === 'Skilled Worker') {
                score -= 10;
                weaknesses.push("Funds potentially below maintenance requirement");
            }

            // Clamp
            score = Math.max(5, Math.min(95, score));

            res.json({
                probability: score,
                score: score,
                factors: [
                    { factor: "Job Offer", points: inputs.jobOffer ? 30 : 0, weight: 30 },
                    { factor: "Education", points: 10, weight: 20 },
                    { factor: "Experience", points: 10, weight: 20 }
                ],
                strengths: strengths.length ? strengths : ["General Profile"],
                weaknesses: weaknesses.length ? weaknesses : ["Review specific requirements"],
                recommendations: recommendations.length ? recommendations : ["Consult a lawyer"],
                message: "Assessment based on preliminary data. AI service execution skipped."
            });
        }
    })
);

export default router;
