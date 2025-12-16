import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { interviews, insertInterviewSchema } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Start a new interview session
router.post(
    "/start",
    authenticate,
    asyncHandler(async (req, res) => {
        const { title, type } = req.body;

        // Create new interview record
        const [interview] = await db.insert(interviews).values({
            userId: req.user!.userId,
            title: title || "Mock Interview",
            type: type || "mock_interview",
            status: "in_progress",
            transcript: []
        }).returning();

        res.json(interview);
    })
);

// Get past interviews
router.get(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        const userInterviews = await db.query.interviews.findMany({
            where: sql`user_id = ${req.user!.userId}`,
            orderBy: [desc(interviews.createdAt)]
        });
        res.json(userInterviews);
    })
);

// Get single interview details
router.get(
    "/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const interview = await db.query.interviews.findFirst({
            where: sql`id = ${id}`
        });

        if (!interview) throw new AppError(404, "Interview not found");
        // Simple ownership check (using string comparison for UUIDs)
        if (String(interview.userId) !== String(req.user!.userId)) {
            throw new AppError(403, "Access denied");
        }

        res.json(interview);
    })
);

// Complete interview and save feedback
router.post(
    "/:id/complete",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        // feedback could be provided by frontend if AI processed it there, 
        // or we might trigger an async job here to process the audio/transcript.
        // simpler for now: save what is passed.
        const { feedback, transcript, durationSeconds } = req.body;

        const [updated] = await db.update(interviews)
            .set({
                status: "completed",
                feedback: feedback || null,
                transcript: transcript || [],
                durationSeconds: durationSeconds || 0
            })
            .where(sql`id = ${id}`)
            .returning();

        res.json(updated);
    })
);

export default router;
