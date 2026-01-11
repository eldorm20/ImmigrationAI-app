import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { transcribeAudio, translateAudioToEnglish } from "../lib/whisper";
import { logger } from "../lib/logger";
import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/webm",
            "audio/ogg",
            "audio/m4a"
        ];

        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new Error("Only audio files are allowed"));
        }
    },
});

/**
 * POST /api/stt/transcribe
 * Transcribe audio to text
 */
router.post("/transcribe", authenticate, upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        const language = req.body.language || "auto";

        logger.info({
            userId: req.user?.userId,
            fileSize: req.file.size,
            language
        }, "Processing STT transcription request");

        const result = await transcribeAudio(req.file.buffer, language);

        if (!result.success) {
            return res.status(500).json({
                error: result.error || "Transcription failed",
            });
        }

        res.json({
            success: true,
            text: result.text,
            language: result.language,
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "STT transcription endpoint error");
        res.status(500).json({
            error: "Failed to transcribe audio",
            details: error.message,
        });
    }
});

/**
 * POST /api/stt/translate
 * Translate audio to English
 */
router.post("/translate", authenticate, upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        logger.info({
            userId: req.user?.userId,
            fileSize: req.file.size
        }, "Processing STT translation request");

        const result = await translateAudioToEnglish(req.file.buffer);

        if (!result.success) {
            return res.status(500).json({
                error: result.error || "Translation failed",
            });
        }

        res.json({
            success: true,
            text: result.text,
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "STT translation endpoint error");
        res.status(500).json({
            error: "Failed to translate audio",
            details: error.message,
        });
    }
});

export default router;
