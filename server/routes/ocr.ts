import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";

const router = Router();

// Configure multer for memory storage (Tesseract works with buffers)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

router.use(authenticate);

import { extractTextFromBuffer, parseTextToJSON } from "../lib/ocr";

// POST /extract - Extract text from image
router.post(
    "/extract",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new AppError(400, "No file provided");
        }

        logger.info({ userId: req.user!.userId, size: req.file.size }, "Starting OCR extraction");

        try {
            const text = await extractTextFromBuffer(req.file.buffer);

            // Parse the raw text into structured data
            const structuredData = await parseTextToJSON(text);

            res.json({
                rawText: text,
                data: structuredData
            });

        } catch (err) {
            logger.error({ err }, "OCR extraction failed");
            throw new AppError(500, "Failed to process document");
        }
    })
);

export default router;
