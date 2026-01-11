import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import { analyzeDocumentImage, analyzeMultipleDocuments, validateDocumentImage } from "../lib/vision-ai";
import { logger } from "../lib/logger";
import multer from "multer";
import sharp from "sharp";

const router = Router();

// Configure multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});

/**
 * POST /api/vision/analyze
 * Analyze a single document image
 */
router.post("/analyze", verifyToken, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const documentType = req.body.documentType || "general";

        logger.info({
            userId: req.user?.userId,
            documentType,
            fileSize: req.file.size
        }, "Processing vision AI request");

        // Convert image to base64
        // Optimize image first to reduce processing time
        const optimizedImage = await sharp(req.file.buffer)
            .resize(1600, 1200, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

        const base64Image = optimizedImage.toString("base64");

        // Analyze with LLAVA
        const result = await analyzeDocumentImage(base64Image, documentType);

        if (!result.success) {
            return res.status(500).json({
                error: result.error || "Document analysis failed",
            });
        }

        // Log successful analysis
        logger.info({
            userId: req.user?.userId,
            documentType,
            success: true
        }, "Vision AI analysis completed");

        res.json({
            success: true,
            data: result.data,
            confidence: result.confidence,
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "Vision AI endpoint error");
        res.status(500).json({
            error: "Failed to analyze document",
            details: error.message,
        });
    }
});

/**
 * POST /api/vision/analyze-batch
 * Analyze multiple documents at once
 */
router.post("/analyze-batch", verifyToken, upload.array("images", 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No images provided" });
        }

        logger.info({
            userId: req.user?.userId,
            count: files.length
        }, "Processing batch vision AI request");

        // Convert all images to base64
        const images = await Promise.all(
            files.map(async (file, index) => {
                const optimizedImage = await sharp(file.buffer)
                    .resize(1600, 1200, { fit: "inside", withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                return {
                    base64: optimizedImage.toString("base64"),
                    type: req.body[`documentType_${index}`] || "general",
                };
            })
        );

        // Analyze all documents
        const results = await analyzeMultipleDocuments(images);

        res.json({
            success: true,
            results: results,
            count: results.length,
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "Batch vision AI endpoint error");
        res.status(500).json({
            error: "Failed to analyze documents",
            details: error.message,
        });
    }
});

/**
 * POST /api/vision/validate
 * Quick validation - is this a valid document?
 */
router.post("/validate", verifyToken, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const optimizedImage = await sharp(req.file.buffer)
            .resize(800, 600, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();

        const base64Image = optimizedImage.toString("base64");
        const isValid = await validateDocumentImage(base64Image);

        res.json({
            valid: isValid,
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "Document validation endpoint error");
        res.status(500).json({
            error: "Failed to validate document",
        });
    }
});

export default router;
