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

        // Check file type
        const mimeType = req.file.mimetype;
        if (mimeType === 'application/pdf') {
            throw new AppError(400, "PDF files are not supported for direct OCR. Please convert to image format (JPEG, PNG) first.");
        }

        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(mimeType)) {
            throw new AppError(400, `Unsupported file type: ${mimeType}. Please upload an image file.`);
        }

        logger.info({ userId: req.user!.userId, size: req.file.size, mimeType }, "Starting OCR extraction");

        try {
            const text = await extractTextFromBuffer(req.file.buffer, mimeType);

            // Parse the raw text into structured data
            const structuredData = await parseTextToJSON(text);

            res.json({
                rawText: text,
                data: structuredData
            });

        } catch (err: any) {
            logger.error({ err: err.message, userId: req.user!.userId }, "OCR extraction failed");

            // Return user-friendly error messages
            if (err.message?.includes('PDF')) {
                throw new AppError(400, err.message);
            }

            throw new AppError(500, "Failed to process document. Please ensure the image is clear and readable.");
        }
    })
);

export default router;
