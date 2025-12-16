import { createWorker } from "tesseract.js";
import OpenAI from "openai";
import { logger } from "./logger";

// Initialize OpenAI if key is available
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();
        return text;
    } catch (err) {
        logger.error({ err }, "OCR extraction failed");
        throw new Error("Failed to extract text from document");
    }
}

export async function parseTextToJSON(text: string): Promise<any> {
    // If OpenAI is available, use it for structured extraction
    if (openai) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini", // fast and cheap
                messages: [
                    {
                        role: "system",
                        content: "You are an OCR validation assistant. Extract structured data from the provided raw text of a document (ID, Passport, or Visa). Return ONLY a JSON object with keys: firstName, lastName, dateOfBirth (YYYY-MM-DD), passportNumber, nationality, expirationDate (YYYY-MM-DD), country. If a field is not found, use null."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                response_format: { type: "json_object" }
            });
            return JSON.parse(response.choices[0].message.content || "{}");
        } catch (err) {
            logger.warn({ err }, "OpenAI parsing failed, falling back to regex");
        }
    }

    // Regex fallback (very basic)
    const result: any = {};
    const dateRegex = /\b\d{2}[-/]\d{2}[-/]\d{4}\b|\b\d{4}[-/]\d{2}[-/]\d{2}\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) result.dateOfBirth = dateMatch[0];

    return result;
}
