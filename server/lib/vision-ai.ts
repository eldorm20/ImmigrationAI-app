import { logger } from "./logger";
import { getCachedDocumentAnalysis, cacheDocumentAnalysis } from "./cache";
import crypto from "crypto";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";

export interface DocumentAnalysisResult {
    success: boolean;
    data?: {
        fullName?: string;
        passportNumber?: string;
        dateOfBirth?: string;
        nationality?: string;
        expiryDate?: string;
        issueDate?: string;
        placeOfBirth?: string;
        documentType?: string;
        rawText?: string;
    };
    error?: string;
    confidence?: number;
    source?: string;
}

/**
 * Analyze a document image using LLAVA vision AI
 * Supports: Passports, Visas, ID cards, Bank statements, etc.
 */
export async function analyzeDocumentImage(
    imageBase64: string,
    documentType: "passport" | "visa" | "id_card" | "bank_statement" | "general" = "general"
): Promise<DocumentAnalysisResult> {
    try {
        // 1. Generate hash of the image for caching
        const imageHash = crypto.createHash("md5").update(imageBase64).digest("hex");

        // 2. Check cache (24 hour TTL for documents)
        const cached = await getCachedDocumentAnalysis(imageHash);
        if (cached) {
            return {
                success: true,
                data: cached,
                confidence: 1.0,
                source: "cache"
            };
        }

        logger.info({ documentType, imageHash: imageHash.substring(0, 8) }, "Starting LLAVA document analysis");

        // Prepare prompt based on document type
        const prompts = {
            passport: `You are a precise data extraction AI. Analyze this passport image and extract the following fields into a JSON object:
- fullName: The full name of the passport holder.
- passportNumber: The passport number.
- dateOfBirth: Date of birth in YYYY-MM-DD format.
- nationality: The nationality/country code.
- expiryDate: Date of expiry in YYYY-MM-DD format.
- issueDate: Date of issue in YYYY-MM-DD format.
- placeOfBirth: Place of birth.
- documentType: Always return "passport".

Return ONLY the raw JSON object. Do not include markdown formatting (like \`\`\`json). If a field is not visible, use null.`,

            visa: `You are a precise data extraction AI. Analyze this visa image and extract the following fields into a JSON object:
- fullName: The full name of the visa holder.
- visaNumber: The visa number.
- dateOfBirth: Date of birth in YYYY-MM-DD format.
- passportNumber: The associated passport number.
- expiryDate: Date of expiry in YYYY-MM-DD format.
- issueDate: Date of issue in YYYY-MM-DD format.
- type: The type of visa (e.g., Student, Work, Tourist).
- documentType: Always return "visa".

Return ONLY the raw JSON object. Do not include markdown formatting.`,

            id_card: `You are a precise data extraction AI. Analyze this ID card and extract the following fields into a JSON object:
- fullName: The full name.
- idNumber: The ID number.
- dateOfBirth: Date of birth in YYYY-MM-DD format.
- nationality: The nationality.
- expiryDate: Date of expiry in YYYY-MM-DD format.
- documentType: Always return "id_card".

Return ONLY the raw JSON object. Do not include markdown formatting.`,

            bank_statement: `You are a financial data AI. Analyze this bank statement header/summary and extract:
- bankName: The name of the bank.
- accountHolder: The name of the account holder.
- accountNumber: The account number (if visible, partially masked is ok).
- statementDate: The date of the statement.
- documentType: Always return "bank_statement".

Return ONLY the raw JSON object.`,

            general: `Analyze this document and extract key information into a JSON object with meaningful keys (e.g., title, date, namesFound).
Include a "summary" field with a brief description.
Set "documentType" to "general".
Return ONLY the raw JSON object.`
        };

        const prompt = prompts[documentType];

        // Call LLAVA API
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llava:7b",
                prompt: prompt,
                images: [imageBase64],
                stream: false,
                format: "json", // Enforce JSON mode
                options: {
                    temperature: 0.1, // Low temperature for factual extraction
                    num_predict: 512,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error({ status: response.status, error: errorText }, "LLAVA API request failed");
            throw new Error(`LLAVA API error: ${response.statusText}`);
        }

        const result = await response.json();
        logger.info({ responseLength: result.response?.length }, "Received LLAVA response");

        // Parse the JSON response
        let extractedData;
        try {
            // Clean the response - remove markdown code blocks if present
            let cleanResponse = result.response.trim();
            cleanResponse = cleanResponse.replace(/```json\n?/g, "");
            cleanResponse = cleanResponse.replace(/```\n?/g, "");
            cleanResponse = cleanResponse.trim();

            extractedData = JSON.parse(cleanResponse);
        } catch (parseError) {
            logger.warn({ response: result.response }, "Failed to parse LLAVA JSON response, using raw text");
            extractedData = {
                rawText: result.response,
                documentType: documentType,
            };
        }

        // Cache the result
        if (extractedData) {
            try {
                await cacheDocumentAnalysis(imageHash, extractedData, 86400);
            } catch (cacheErr) {
                logger.warn({ err: cacheErr }, "Failed to cache document analysis");
            }
        }

        return {
            success: true,
            data: extractedData,
            confidence: 0.85, // LLAVA typically has high confidence
            source: "llava"
        };
    } catch (error: any) {
        logger.error({ error: error.message }, "Document analysis failed");
        return {
            success: false,
            error: error.message || "Failed to analyze document",
        };
    }
}

/**
 * Analyze multiple documents in batch
 */
export async function analyzeMultipleDocuments(
    images: Array<{ base64: string; type: string }>
): Promise<DocumentAnalysisResult[]> {
    const results = await Promise.all(
        images.map((img) =>
            analyzeDocumentImage(
                img.base64,
                img.type as any
            )
        )
    );

    return results;
}

/**
 * Quick validation check - is this a valid document image?
 */
export async function validateDocumentImage(imageBase64: string): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llava:7b",
                prompt: "Is this a valid passport, visa, ID card, or official document? Answer with only 'yes' or 'no'.",
                images: [imageBase64],
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 10,
                },
            }),
        });

        const result = await response.json();
        return result.response.toLowerCase().trim().startsWith("yes");
    } catch (error) {
        logger.error({ error }, "Document validation failed");
        return false;
    }
}
