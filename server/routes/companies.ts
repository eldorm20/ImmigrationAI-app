import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { companies, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Mock data for company search
const MOCK_COMPANIES = [
    {
        company_number: "12345678",
        title: "MOCK IMMIGRATION SERVICES LTD",
        company_status: "active",
        address_snippet: "123 High Street, London, UK",
        date_of_creation: "2020-01-01",
        sponsor_license: { status: "licensed", type: "Worker (Tier 2)", rating: "A-rated" }
    },
    {
        company_number: "87654321",
        title: "GLOBAL TALENT VISA SPONSORS INC",
        company_status: "active",
        address_snippet: "456 Tech Park, Manchester, UK",
        date_of_creation: "2019-05-15",
        sponsor_license: { status: "licensed", type: "Skilled Worker", rating: "A-rated" }
    },
    {
        company_number: "09876543",
        title: "LONDON TECH SOLUTIONS LTD",
        company_status: "active",
        address_snippet: "789 Innovation Way, Shoreditch, London",
        date_of_creation: "2018-11-20",
        sponsor_license: { status: "not_licensed", type: "None", rating: "N/A" }
    },
    {
        company_number: "11223344",
        title: "BRITISH EDUCATION GROUP",
        company_status: "active",
        address_snippet: "10 University Rd, Oxford, UK",
        date_of_creation: "2015-03-10",
        sponsor_license: { status: "licensed", type: "Student Sponor", rating: "Highly Trusted" }
    }
];

// Public: Lookup Company by Subdomain
router.get(
    "/lookup",
    asyncHandler(async (req, res) => {
        const subdomain = req.query.subdomain as string;
        if (!subdomain) {
            return res.status(400).json({ message: "Subdomain required" });
        }

        const company = await db.query.companies.findFirst({
            where: eq(companies.subdomain, subdomain),
            columns: {
                id: true,
                name: true,
                logo: true,
                subdomain: true,
                brandingConfig: true,
                isActive: true
            }
        });

        if (!company || !company.isActive) {
            return res.status(404).json({ message: "Company not found" });
        }

        res.json(company);
    })
);

// Protected: Get My Company (Employer)
router.get(
    "/me",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const company = await db.query.companies.findFirst({
            where: eq(companies.userId, userId)
        });
        res.json(company || null);
    })
);

// Protected: Update Branding (Employer)
router.patch(
    "/branding",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { subdomain, brandingConfig, logo } = req.body;

        // Verify ownership
        const company = await db.query.companies.findFirst({
            where: eq(companies.userId, userId)
        });

        if (!company) throw new AppError(404, "Company profile not found");

        const updateData: any = {};
        if (subdomain !== undefined) updateData.subdomain = subdomain;
        if (brandingConfig !== undefined) updateData.brandingConfig = brandingConfig;
        if (logo !== undefined) updateData.logo = logo;

        // Check subdomain uniqueness if changing
        if (subdomain && subdomain !== company.subdomain) {
            const existing = await db.query.companies.findFirst({
                where: eq(companies.subdomain, subdomain)
            });
            if (existing) throw new AppError(409, "Subdomain already taken");
        }

        const updated = await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.id, company.id))
            .returning();

        res.json(updated[0]);
    })
);

// Public/Protected: Search Companies (Companies House)
router.get("/search", async (req, res) => {
    const query = req.query.q as string;

    if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

    try {
        if (!apiKey) {
            // logger.warn("COMPANIES_HOUSE_API_KEY not set. Returning mock data.");
            // Filter mock data
            const results = MOCK_COMPANIES.filter(c =>
                c.title.toLowerCase().includes(query.toLowerCase()) ||
                c.company_number.includes(query)
            );
            return res.json({ items: results, total_results: results.length });
        }

        const auth = Buffer.from(apiKey + ':').toString('base64');
        const response = await fetch(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logger.error("Companies House API Unauthorized. Check API Key.");
                return res.status(500).json({ error: "External service configuration error" });
            }
            throw new Error(`Companies House API responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        logger.error({ error, query }, "Company search failed");
        res.status(500).json({ error: "Failed to search companies" });
    }
});

// Export both default and named to satisfy imports
export const companyRouter = router;
export default router;
