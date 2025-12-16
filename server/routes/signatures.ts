import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { signatureRequests, users, documents } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.use(authenticate);

// Get my signature requests (ToDo and Sent)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        const requests = await db.query.signatureRequests.findMany({
            where: or(
                eq(signatureRequests.signerId, userId),
                eq(signatureRequests.requesterId, userId)
            ),
            orderBy: [desc(signatureRequests.createdAt)],
            with: {
                // ideally join document, but raw is fine.
            }
        });

        res.json(requests);
    })
);

// Create a signature request
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { documentId, signerId } = z.object({
            documentId: z.string().optional(),
            signerId: z.string().uuid()
        }).parse(req.body);

        const [request] = await db.insert(signatureRequests).values({
            requesterId: userId,
            signerId: signerId,
            documentId: documentId,
            status: "pending"
        }).returning();

        res.json(request);
    })
);

// Sign a request (Upload signature)
router.post(
    "/:id/sign",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const requestId = req.params.id;
        const { signatureData } = z.object({
            signatureData: z.string().min(1) // Base64 data URI
        }).parse(req.body);

        const request = await db.query.signatureRequests.findFirst({
            where: eq(signatureRequests.id, requestId)
        });

        if (!request) throw new AppError(404, "Request not found");
        if (request.signerId !== userId) throw new AppError(403, "Not authorized to sign this request");
        if (request.status === "signed") throw new AppError(400, "Already signed");

        const [updated] = await db.update(signatureRequests).set({
            status: "signed",
            signatureUrl: signatureData, // Storing Data URI directly for MVP
            signedAt: new Date(),
            updatedAt: new Date()
        }).where(eq(signatureRequests.id, requestId)).returning();

        res.json(updated);
    })
);

export default router;
