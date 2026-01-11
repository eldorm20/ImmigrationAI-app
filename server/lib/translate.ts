import { logger } from "./logger";
// @ts-ignore
import translate from "google-translate-api-x";
import { agentsManager } from "./agents"; // For AI fallback

// LibreTranslate URL
const LIBRETRANSLATE_URL = process.env.LIBRE_TRANSLATE_URL || "http://libretranslate:5000";

interface TranslateResponse {
    translatedText: string;
    error?: string;
}

export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string = "auto"
): Promise<TranslateResponse> {
    if (!text || text.trim().length === 0) return { translatedText: "" };

    // 1. Special Handling for Uzbek (Not supported by LibreTranslate common models)
    if (targetLang === "uz" || targetLang === "uz-UZ") {
        return translateUzbek(text, sourceLang);
    }

    // 2. For all other languages, prefer Self-Hosted LibreTranslate
    try {
        if (LIBRETRANSLATE_URL) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data: any = await response.json();
                return { translatedText: data.translatedText };
            }
        }
    } catch (libreError) {
        logger.warn({ libreError }, "LibreTranslate failed, falling back to Google/AI");
    }

    // 3. Fallback to Google Translate (Free API)
    return translateWithGoogle(text, targetLang, sourceLang);
}

/**
 * Specialized handler for Uzbek translation
 * Tries Google first, falls back to AI (OLLAMA)
 */
async function translateUzbek(text: string, sourceLang: string): Promise<TranslateResponse> {
    // Try Google first (Best quality for logic-less method)
    try {
        const res = await translate(text, { from: sourceLang === "auto" ? "auto" : sourceLang, to: "uz" });
        return { translatedText: res.text };
    } catch (googleError) {
        logger.warn("Google Translate for Uzbek failed, falling back to AI");

        // Fallback to AI
        return translateWithAI(text, "Uzbek");
    }
}

/**
 * General Google Translate Wrapper
 */
async function translateWithGoogle(text: string, target: string, source: string): Promise<TranslateResponse> {
    try {
        const res = await translate(text, { from: source === "auto" ? "auto" : source, to: target });
        return { translatedText: res.text };
    } catch (error) {
        logger.error({ error }, "Google Translate failed");
        return { translatedText: text, error: "Translation failed" };
    }
}

/**
 * AI Translation Fallback (Slow but guaranteed self-hosted)
 */
async function translateWithAI(text: string, targetLanguage: string): Promise<TranslateResponse> {
    try {
        const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translation, no extra text:
        
"${text}"`;

        // Use the lightest available model
        const response = await agentsManager.processRequest(prompt, "helper");

        if (response.success && response.data) {
            // Cleanup quotes if AI added them
            let translated = response.data.trim();
            if (translated.startsWith('"') && translated.endsWith('"')) {
                translated = translated.slice(1, -1);
            }
            return { translatedText: translated };
        }
        throw new Error("AI returned empty");
    } catch (error: any) {
        logger.error({ error: error.message }, "AI Translation failed");
        return { translatedText: text, error: "AI Translation failed" };
    }
}
