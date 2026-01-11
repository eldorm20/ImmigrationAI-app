import { logger } from "./logger";

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
        logger.info({ documentType }, "Starting LLAVA document analysis");

        // Prepare prompt based on document type
        const prompts = {
            passport: `Analyze this passport image carefully. Extract the following information and return ONLY valid JSON (no markdown, no explanations):
{
  "fullName": "full name as shown",
  "passportNumber": "passport number",
  "dateOfBirth": "YYYY-MM-DD format",
  "nationality": "country name",
  "expiryDate": "YYYY-MM-DD format",
  "issueDate": "YYYY-MM-DD format",
  "placeOfBirth": "place of birth if visible",
  "documentType": "passport"
}

If any field is not visible or unclear, use null for that field.`,

            visa: `Analyze this visa document. Extract and return ONLY valid JSON:
{
  "fullName": "applicant name",
  "visaNumber": "visa number",
  "visaType": "type of visa",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "nationality": "nationality",
  "documentType": "visa"
}`,

            id_card: `Analyze this ID card. Extract and return ONLY valid JSON:
{
  "fullName": "full name",
  "idNumber": "ID number",
  "dateOfBirth": "YYYY-MM-DD format",
  "nationality": "nationality",
  "expiryDate": "YYYY-MM-DD format if present",
  "documentType": "id_card"
}`,

            bank_statement: `Analyze this bank statement. Extract and return ONLY valid JSON:
{
  "accountHolder": "account holder name",
  "accountNumber": "last 4 digits of account if visible",
  "bankName": "bank name",
  "statementDate": "YYYY-MM-DD format",
  "balance": "closing balance if visible",
  "documentType": "bank_statement"
}`,

            general: `Analyze this document carefully. Extract all visible text and key information. Return ONLY valid JSON:
{
  "documentType": "type of document",
  "extractedText": "main text content",
  "keyInformation": {}
}`
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
                options: {
                    temperature: 0.1, // Low temperature for accurate extraction
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

        return {
            success: true,
            data: extractedData,
            confidence: 0.85, // LLAVA typically has high confidence
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
