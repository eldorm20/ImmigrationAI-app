import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { simulateVoiceConversation } from "../lib/ai";
import { incrementUsage } from "../lib/aiUsage";

const router = Router();

router.use(authenticate);

const voiceInteractSchema = z.object({
    message: z.string().min(1),
    history: z.array(z.object({
        role: z.string(),
        content: z.string()
    })).default([]),
    visaType: z.string().default("General")
});

router.post(
    "/interact",
    apiLimiter,
    asyncHandler(async (req, res) => {
        const { message, history, visaType } = voiceInteractSchema.parse(req.body);
        const userId = req.user!.userId;

        // Increment AI usage
        await incrementUsage(userId, 'aiMonthlyRequests', 1);

        const response = await simulateVoiceConversation(message, history, visaType);

        res.json({ response });
    })
);

export default router;
