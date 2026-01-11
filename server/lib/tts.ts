import { logger } from "./logger";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const TTS_URL = process.env.TTS_URL || "http://coqui-tts:5002";

export interface TTSResult {
    success: boolean;
    audioBuffer?: Buffer;
    error?: string;
    format?: string;
}

/**
 * Synthesize speech from text using Coqui TTS
 */
export async function synthesizeSpeech(
    text: string,
    language: string = "en"
): Promise<TTSResult> {
    try {
        const startTime = Date.now();

        // Optimize text for speech: remove markdown, code blocks, excessive punctuation
        const cleanText = text
            .replace(/```[\s\S]*?```/g, "Code block omitted.") // Remove code blocks
            .replace(/\*\*/g, "")                              // Remove bold
            .replace(/#/g, "")                                 // Remove headers
            .replace(/\[.*?\]\(.*?\)/g, "link")                // Remove links
            .substring(0, 1000);                               // Limit length

        logger.info({ length: cleanText.length, language }, "Starting TTS synthesis");

        // Prepare request
        // Using Coqui-TTS API format
        const response = await fetch(`${TTS_URL}/api/tts?text=${encodeURIComponent(cleanText)}&speaker_id=&style_wav=&language_id=${language}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`TTS API error: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        logger.info({
            duration: Date.now() - startTime,
            size: buffer.length
        }, "TTS synthesis completed");

        return {
            success: true,
            audioBuffer: buffer,
            format: "wav"
        };
    } catch (error: any) {
        logger.error({ error: error.message }, "TTS synthesis failed");
        return {
            success: false,
            error: error.message || "TTS failed"
        };
    }
}

/**
 * Generate hash for TTS caching
 */
export function getTTSCacheKey(text: string, language: string): string {
    return crypto.createHash("md5").update(`${text}:${language}`).digest("hex");
}
