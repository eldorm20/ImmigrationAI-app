import { Router } from "express";
import { GovCheckService } from "../lib/gov-check";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { z } from "zod";

const router = Router();
const govCheck = new GovCheckService({
    companiesHouseApiKey: process.env.UK_GOV_API_KEY || "",
    homeOfficeApiKey: process.env.HOME_OFFICE_API_KEY || ""
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
        const { shareCode, dateOfBirth } = z.object({
            shareCode: z.string().min(9).max(9),
            dateOfBirth: z.string() // Format: YYYY-MM-DD
        }).parse(req.body);

        const result = await govCheck.checkRightToWork(shareCode, dateOfBirth);
        if (!result) throw new AppError(400, "Could not verify Right to Work. Please check your share code and DOB.");
        res.json(result);
    })
);

/**
 * Check Immigration Status
 */
router.post(
    "/immigration-status",
    asyncHandler(async (req, res) => {
        const { shareCode, dateOfBirth } = z.object({
            shareCode: z.string().min(9).max(9),
            dateOfBirth: z.string()
        }).parse(req.body);

        const result = await govCheck.checkImmigrationStatus(shareCode, dateOfBirth);
        if (!result) throw new AppError(400, "Could not verify Immigration Status.");
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

export default router;
