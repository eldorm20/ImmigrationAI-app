import fetch from "node-fetch";
import { logger } from "./logger";

// Default to a common local port for LibreTranslate or allow env override
const LIBRETRANSLATE_URL = process.env.LIBRE_TRANSLATE_URL || "http://localhost:5000";

interface TranslateResponse {
    translatedText: string;
    error?: string;
}

export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string = "auto"
): Promise<TranslateResponse> {
    if (!text) return { translatedText: "" };

    try {
        // LibreTranslate API: POST /translate
        // Body: { q: text, source: sourceLang, target: targetLang, format: "text" }

        const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang,
                format: "text",
                api_key: process.env.LIBRE_TRANSLATE_API_KEY || "", // Optional if self-hosted auth is on
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            logger.error({ status: response.status, errText, url: LIBRETRANSLATE_URL }, "LibreTranslate request failed");

            // Strict "Real" Mode: Do not fallback to mock.
            // If the service is down, we must tell the user to run it.
            return {
                translatedText: "",
                error: `Translation Service Unavailable. Please ensure LibreTranslate is running at ${LIBRETRANSLATE_URL} (docker run -ti --rm -p 5000:5000 libretranslate/libretranslate)`
            };
        }

        const data: any = await response.json();
        return { translatedText: data.translatedText };

    } catch (error) {
        logger.error({ error, url: LIBRETRANSLATE_URL }, "LibreTranslate connection error");

        // Strict Error Message for "Real" mode
        return {
            translatedText: "",
            error: `Could not connect to Translation Service at ${LIBRETRANSLATE_URL}. Please start your local LibreTranslate instance.`
        };
    }
}
