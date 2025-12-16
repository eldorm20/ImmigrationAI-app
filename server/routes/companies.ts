import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { companies, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

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
            if (existing) throw new AppError(409, "Subdomain using already taken");
        }

        const updated = await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.id, company.id))
            .returning();

        res.json(updated[0]);
    })
);

export default router;
