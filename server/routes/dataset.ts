import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { aiDataset } from "@shared/schema";
import { logger } from "../lib/logger";
import { desc, eq } from "drizzle-orm";

const router = Router();

// Store feedback (Good/Bad)
router.post(
    "/feedback",
    authenticate,
    asyncHandler(async (req, res) => {
        const { query, response, rating, category } = req.body;

        await db.insert(aiDataset).values({
            query,
            response,
            rating, // 1 or -1
            category: category || "general",
            metadata: { userId: req.user!.userId }
        });

        res.json({ success: true });
    })
);

// Admin: Export dataset for OpenAI Fine-Tuning (JSONL)
router.get(
    "/export",
    authenticate,
    asyncHandler(async (req, res) => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "Admin only" });
        }

        const data = await db.query.aiDataset.findMany({
            where: eq(aiDataset.rating, 1), // Only good examples
            orderBy: [desc(aiDataset.createdAt)]
        });

        // Format for OpenAI: {"messages": [{"role": "system", "content": "..."} ...]}
        const jsonl = data.map(entry => {
            return JSON.stringify({
                messages: [
                    { role: "system", content: "You are an immigration law expert." },
                    { role: "user", content: entry.query },
                    { role: "assistant", content: entry.response }
                ]
            });
        }).join("\n");

        res.header("Content-Type", "application/jsonl");
        res.send(jsonl);
    })
);

export default router;
