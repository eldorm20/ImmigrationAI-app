import { logger } from "./logger";

const WHISPER_URL = process.env.WHISPER_URL || "http://localhost:9000";

export interface TranscriptionResult {
    success: boolean;
    text?: string;
    language?: string;
    error?: string;
}

/**
 * Transcribe audio using Whisper STT
 * Supports: MP3, WAV, M4A, WEBM, OGG
 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    language?: string
): Promise<TranscriptionResult> {
    try {
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
        formData.append("audio_file", audioBlob, "audio.webm");

        if (language) {
            formData.append("language", language);
        }

        formData.append("task", "transcribe");
        formData.append("output", "json");

        const response = await fetch(`${WHISPER_URL}/asr`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Whisper API error: ${response.statusText}`);
        }

        const result = await response.json();

        logger.info({
            textLength: result.text?.length,
            language: result.language
        }, "Whisper transcription completed");

        return {
            success: true,
            text: result.text,
            language: result.language,
        };
    } catch (error: any) {
        logger.error({ error: error.message }, "Whisper transcription failed");
        return {
            success: false,
            error: error.message || "Transcription failed",
        };
    }
}

/**
 * Translate audio to English using Whisper
 */
export async function translateAudioToEnglish(
    audioBuffer: Buffer
): Promise<TranscriptionResult> {
    try {
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
        formData.append("audio_file", audioBlob, "audio.webm");
        formData.append("task", "translate");
        formData.append("output", "json");

        const response = await fetch(`${WHISPER_URL}/asr`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Whisper API error: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            success: true,
            text: result.text,
            language: "en",
        };
    } catch (error: any) {
        logger.error({ error: error.message }, "Whisper translation failed");
        return {
            success: false,
            error: error.message || "Translation failed",
        };
    }
}
