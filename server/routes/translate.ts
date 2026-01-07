import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { translateText } from "../lib/translate";

const router = Router();

// Schema for translation request
const translateSchema = z.object({
    text: z.string().min(1),
    source: z.string().default("auto"),
    target: z.string().min(2), // e.g., "es", "fr", "de"
});

// POST /api/translate
// Public or protected? Usually user-facing, so protected to prevent abuse.
router.post(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        const { text, source, target } = translateSchema.parse(req.body);

        const result = await translateText(text, target, source);

        if (result.error) {
            // Return 503 if service is down/misconfigured
            throw new AppError(503, result.error);
        }

        res.json({ translation: result.translatedText });
    })
);

export default router;
