import { logger } from "./logger";
// @ts-ignore
import translate from "google-translate-api-x";

// Optional: LibreTranslate URL if configured
const LIBRETRANSLATE_URL = process.env.LIBRE_TRANSLATE_URL;

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
        // Attempt 1: Google Translate (Free/Unofficial)
        // This mimics browser behavior and is what users typically expect for "free google translate"
        const updateSource = sourceLang === "auto" ? "auto" : sourceLang;

        const res = await translate(text, { from: updateSource, to: targetLang });
        return { translatedText: res.text };

    } catch (googleError) {
        logger.warn({ googleError, text }, "Google Translate failed, falling back...");

        // Attempt 2: LibreTranslate (if configured)
        if (LIBRETRANSLATE_URL) {
            try {
                const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        q: text,
                        source: sourceLang,
                        target: targetLang,
                        format: "text",
                        api_key: process.env.LIBRE_TRANSLATE_API_KEY || "",
                    }),
                });

                if (response.ok) {
                    const data: any = await response.json();
                    return { translatedText: data.translatedText };
                }
            } catch (libreError) {
                logger.error({ libreError }, "LibreTranslate fallback also failed");
            }
        }

        // Final Fallback: Return original text with warning prefix to avoid crashing UI
        return {
            translatedText: `[Untranslated] ${text}`,
            error: "Translation services unavailable"
        };
    }
}
