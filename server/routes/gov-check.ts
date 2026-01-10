import { Router } from "express";
import { GovCheckService } from "../lib/gov-check";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import { db } from "../db";
import { applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { updateRoadmapProgress, updateMilestone } from "../lib/roadmap";
import { logger } from "../lib/logger";

const router = Router();
const govCheck = new GovCheckService({
    companiesHouseApiKey: process.env.UK_GOV_API_KEY || "",
    homeOfficeApiKey: process.env.UK_RTW_API_KEY || process.env.HOME_OFFICE_API_KEY || ""
});

router.use(authenticate);

/**
 * Search for companies in the UK (Companies House)
 */
router.get(
    "/search-company",
    asyncHandler(async (req, res) => {
        const { query } = z.object({ query: z.string().min(2) }).parse(req.query);

        const companies = await govCheck.searchCompany(query);
        res.json(companies);
    })
);

/**
 * Get detailed company profile
 */
router.get(
    "/company/:number",
    asyncHandler(async (req, res) => {
        const { number } = req.params;

        const details = await govCheck.getCompanyDetails(number);
        if (!details) {
            throw new AppError(404, "Company not found or API error");
        }

        res.json(details);
    })
);

/**
 * Check Right to Work Status
 */
router.post(
    "/right-to-work",
    asyncHandler(async (req, res) => {
        const { shareCode: rawShareCode, dateOfBirth, applicationId } = z.object({
            shareCode: z.string().min(9).max(15), // Allow for spaces during entry
            dateOfBirth: z.string(), // Format: YYYY-MM-DD
            applicationId: z.string().optional()
        }).parse(req.body);

        const shareCode = rawShareCode.replace(/\s/g, '');

        try {
            logger.info({ shareCode, dateOfBirth, applicationId }, "Processing Right to Work check request");
            const result = await govCheck.checkRightToWork(shareCode, dateOfBirth);

            if (!result) {
                logger.warn({ shareCode, dateOfBirth }, "Right to Work verification returned no result");
                throw new AppError(400, "Could not verify Right to Work. Please check your share code and DOB.");
            }

            if (applicationId) {
                await updateRoadmapProgress(applicationId);
                await updateMilestone(applicationId, 'govChecks');
            }

            logger.info({ shareCode, success: true }, "Right to Work verification successful");
            res.json(result);
        } catch (error: any) {
            logger.error({ error: error.message, shareCode }, "Right to Work check route error");
            if (error.status === 400) throw error;

            // Provide more specific message if available from HO API
            const message = error.message?.includes("HO RTW API returned")
                ? error.message
                : "Right to Work check service temporarily unavailable. Please try again later.";

            throw new AppError(503, message);
        }
    })
);

/**
 * Check Immigration Status
 */
router.post(
    "/immigration-status",
    asyncHandler(async (req, res) => {
        const { shareCode, dateOfBirth, applicationId } = z.object({
            shareCode: z.string().min(9).max(9),
            dateOfBirth: z.string(),
            applicationId: z.string().optional()
        }).parse(req.body);

        const result = await govCheck.checkImmigrationStatus(shareCode, dateOfBirth);
        if (!result) throw new AppError(400, "Could not verify Immigration Status.");
        if (applicationId) {
            await updateMilestone(applicationId, 'govChecks');
        }
        res.json(result);
    })
);

/**
 * Check Visa Application Status
 */
router.post(
    "/visa-status",
    asyncHandler(async (req, res) => {
        const { reference, lastName, dateOfBirth } = z.object({
            reference: z.string().min(1),
            lastName: z.string().min(1),
            dateOfBirth: z.string()
        }).parse(req.body);

        const result = await govCheck.checkVisaStatus(reference, lastName, dateOfBirth);
        if (!result) throw new AppError(404, "Visa application not found.");
        res.json(result);
    })
);

/**
 * Check USCIS Case Status (USA)
 * Returns a link for manual verification as USCIS has strong bot detection
 */
router.post(
    "/uscis-status",
    asyncHandler(async (req, res) => {
        const { receiptNumber } = z.object({
            receiptNumber: z.string().min(10).max(15) // e.g., IOE1234567890
        }).parse(req.body);

        const result = await govCheck.checkUSCISCaseStatus(receiptNumber);
        if (!result) throw new AppError(400, "Could not check USCIS status.");
        res.json(result);
    })
);

/**
 * Check Uzbekistan E-Visa Status
 */
router.post(
    "/uzbekistan-visa",
    asyncHandler(async (req, res) => {
        const { activationCode, passportNumber } = z.object({
            activationCode: z.string().min(1),
            passportNumber: z.string().min(5).max(20)
        }).parse(req.body);

        const result = await govCheck.checkUzbekistanVisaStatus(activationCode, passportNumber);
        if (!result) throw new AppError(400, "Could not check visa status.");
        res.json(result);
    })
);

export default router;
