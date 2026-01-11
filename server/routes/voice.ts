import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { aiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { transcribeAudio } from "../lib/whisper";
import { synthesizeSpeech } from "../lib/tts";
import { agentsManager } from "../lib/agents";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticate);
router.use(aiLimiter);

/**
 * Voice Chat Endpoint
 * 1. Accepts Audio File
 * 2. Transcribes with Whisper
 * 3. Gets AI Response from OLLAMA
 * 4. Converts Response to Audio with TTS
 * 5. Returns Audio + Text
 */
router.post(
    "/chat",
    upload.single("audio"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: "No audio file provided" });
        }

        const userId = req.user!.userId;
        const language = req.body.language || "en";
        const conversationId = req.body.conversationId;

        logger.info({ userId, conversationId }, "Starting voice chat processing");

        try {
            // 1. Transcribe Audio
            const sttResult = await transcribeAudio(req.file.buffer, language);
            if (!sttResult.success || !sttResult.text) {
                throw new Error(sttResult.error || "Transcription failed");
            }

            const userQuery = sttResult.text;
            logger.info({ userQuery }, "Voice transcription successful");

            // 2. Get AI Response
            const agentResponse = await agentsManager.processRequest(
                userQuery,
                "immigration_lawyer", // Use lawyer persona
                { userId, conversationId, mode: "voice" }
            );

            if (!agentResponse.success || !agentResponse.data) {
                throw new Error(agentResponse.error || "AI processing failed");
            }

            const aiText = agentResponse.data;

            // 3. Synthesize Speech (TTS)
            // Only synthesize if text is reasonable length
            let audioBase64 = null;
            if (aiText.length < 1000) {
                const ttsResult = await synthesizeSpeech(aiText, "en"); // Enforce English for now as Coqui model is en
                if (ttsResult.success && ttsResult.audioBuffer) {
                    audioBase64 = ttsResult.audioBuffer.toString("base64");
                }
            }

            // 4. Return Response
            res.json({
                success: true,
                userText: userQuery,
                aiText: aiText,
                audio: audioBase64,
                audioFormat: "wav",
                conversationId: conversationId
            });

        } catch (error: any) {
            logger.error({ error: error.message }, "Voice chat error");
            res.status(500).json({
                success: false,
                message: error.message || "Voice processing failed"
            });
        }
    })
);

export default router;
