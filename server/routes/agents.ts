import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { generateDocumentRequestMessage } from "../lib/ai";
import { incrementUsage } from "../lib/aiUsage";
import { db } from "../db";
import { applications, users, documents } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.use(authenticate);

// Auto-Collect Documents Agent
router.post(
    "/collect-documents/:applicationId",
    apiLimiter,
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;
        const userId = req.user!.userId;
        // In a real app, we'd verify lawyer owns this client access

        // Fetch application details
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId),
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Fetch user details manually since relations might not be configured
        const user = await db.query.users.findFirst({
            where: eq(users.id, application.userId),
        });

        // Fetch existing documents for this application
        const existingDocs = await db.query.documents.findMany({
            where: eq(documents.applicationId, applicationId),
        });

        const clientName = user ? `${user.firstName} ${user.lastName}` : "Valued Client";
        const userEmail = user ? user.email : "client";
        const visaType = application.visaType || "Visa";

        const uploadedDocTypes = existingDocs.map(d => d.documentType?.toLowerCase() || "");

        // Define required documents based on visa type
        let requiredDocs = ["Passport Scan", "Proof of Funds"];
        if (visaType.includes("Skilled") || visaType.includes("Work")) {
            requiredDocs.push("Job Offer Letter", "Sponsorship Certificate");
        } else if (visaType.includes("Student")) {
            requiredDocs.push("CAS Letter", "English Proficiency");
        } else {
            requiredDocs.push("Identity Proof", "Address Proof");
        }

        // Determine missing documents
        const missingDocs = requiredDocs.filter(reqDoc =>
            !uploadedDocTypes.some(uploaded => uploaded.includes(reqDoc.toLowerCase()))
        );

        // Fallback for demo if everything is uploaded
        if (missingDocs.length === 0) {
            return res.json({
                success: true,
                message: "No documents missing. All clear!",
                details: { missingDocuments: [], draftSent: null }
            });
        }

        // Increment AI usage
        await incrementUsage(userId, 'aiMonthlyRequests', 1);

        // Generate the chase email
        const draftEmail = await generateDocumentRequestMessage(clientName, missingDocs, visaType);

        // Mock "sending" the email
        console.log(`[AGENT] Sending document request to ${userEmail}: \n${draftEmail}`);

        res.json({
            success: true,
            message: "Agent activated - Request sent",
            details: {
                missingDocuments: missingDocs,
                draftSent: draftEmail,
                recipient: userEmail
            }
        });
    })
);

export default router;
