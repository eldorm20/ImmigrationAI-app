import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter, aiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, users, documents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { analyzeCase } from "../lib/ai";
import { incrementUsage } from "../lib/aiUsage";
import { logger } from "../lib/logger";

const router = Router();

// Routes require authentication
router.use(authenticate);

// Analyze an application case
router.post(
    "/cases/:applicationId/analyze",
    aiLimiter,
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;
        const lawyerId = req.user!.userId;
        const role = req.user!.role;

        // Only lawyers can run predictive analysis for now
        if (role !== "lawyer" && role !== "admin") {
            return res.status(403).json({ message: "Only lawyers can run predictive case analysis" });
        }

        // specific lawyer check? For now any lawyer can analyze any case they have access to?
        // application has lawyerId.
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId)
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Check access (Lawyer assigned or Admin)
        if (role === "lawyer" && application.lawyerId !== lawyerId) {
            // Allow if it's a lead assigned to them?
            // If application.lawyerId is null, maybe they can analyze lead?
            // Let's enforce lawyerId match if set.
            if (application.lawyerId) {
                return res.status(403).json({ message: "Access denied to this case" });
            }
        }

        // Fetch Applicant Data
        const applicant = await db.query.users.findFirst({
            where: eq(users.id, application.userId)
        });

        if (!applicant) {
            return res.status(404).json({ message: "Applicant user not found" });
        }

        // Fetch Documents
        const docs = await db.query.documents.findMany({
            where: eq(documents.applicationId, applicationId)
        });

        // Prepare data for AI
        const appData = {
            visaType: application.visaType,
            country: application.country,
            applicant: {
                age: "Unknown", // user schema doesn't have age directly, maybe metadata?
                job: "Unknown", // user schema doesn't have job
                nationality: "Unknown",
                // Use metadata if available
                ...((applicant.metadata as any)?.profile || {})
            },
            details: {
                fee: application.fee,
                status: application.status,
                notes: application.notes,
                appMetadata: application.metadata
            }
        };

        const docSummaries = docs.map(d => ({
            type: d.documentType || d.fileName,
            summary: (d.aiAnalysis as any)?.summary || "No prior analysis"
        }));

        // Increment Usage
        try {
            await incrementUsage(lawyerId, 'aiMonthlyRequests', 1);
        } catch (err) {
            return res.status(403).json({ message: "AI quota exceeded" });
        }

        // Analyze
        const analysis = await analyzeCase(appData, docSummaries);

        // Save to Application Metadata
        const newMetadata = {
            ...((application.metadata as any) || {}),
            aiAnalysis: {
                ...analysis,
                analyzedAt: new Date().toISOString()
            }
        };

        await db.update(applications)
            .set({ metadata: newMetadata, updatedAt: new Date() })
            .where(eq(applications.id, applicationId));

        res.json(analysis);
    })
);

export default router;
