import { createWorker } from "tesseract.js";
import OpenAI from "openai";
import pdf from "pdf-parse";
import { logger } from "./logger";

// Initialize OpenAI if key is available
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function extractTextFromBuffer(buffer: Buffer, mimeType?: string): Promise<string> {
    try {
        // Check if it's a PDF
        if (mimeType === 'application/pdf' || buffer.toString('utf8', 0, 4) === '%PDF') {
            logger.info("PDF file detected, attempting text extraction with pdf-parse");
            try {
                const data = await pdf(buffer);
                if (data.text && data.text.trim().length > 0) {
                    logger.info({ charCount: data.text.length }, "PDF text extraction successful");
                    return data.text;
                }

                // If it's a scanned PDF (no selectable text), we need to notify the user
                logger.warn("PDF appears to be scanned or contains no selectable text");
                throw new Error("This PDF appears to be a scanned document without selectable text. Please upload a high-quality image (JPG/PNG) instead, or a searchable PDF.");
            } catch (pdfErr: any) {
                logger.error({ err: pdfErr.message }, "pdf-parse failed");
                throw new Error(`Failed to parse PDF document: ${pdfErr.message}`);
            }
        }

        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();
        return text;
    } catch (err: any) {
        // Check if it's the PDF error
        if (err.message?.includes('pixReadStream') || err.message?.includes('Pdf reading is not supported')) {
            logger.error("Attempted to OCR a PDF file - not supported");
            throw new Error("PDF files are not supported. Please convert to image format first.");
        }

        logger.error({ err: err.message }, "OCR extraction failed");
        throw new Error(`Failed to extract text from document: ${err.message || 'Unknown error'}`);
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
