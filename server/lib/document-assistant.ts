import { db } from "../db";
import { logger } from "./logger";

export interface DocumentProcessing {
  documentId: string;
  userId: string;
  fileName: string;
  extractedText: string;
  detectedFields: Record<string, string>;
  confidenceScores: Record<string, number>;
  documentType: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processedAt?: Date;
}

export interface FormAutoFill {
  fieldName: string;
  value: string;
  source: string;
  confidence: number;
}

// Analyze document and extract information
export async function analyzeDocument(
  documentId: string,
  fileContent: string
): Promise<DocumentProcessing | null> {
  try {
    logger.info({ documentId }, "Starting document analysis");

    // Simulate AI-powered OCR and text extraction
    const extractedText = fileContent;
    
    // Detect common immigration document fields
    const detectedFields = detectFields(extractedText);
    const confidenceScores = calculateConfidence(detectedFields);
    const documentType = classifyDocument(extractedText);

    const result: DocumentProcessing = {
      documentId,
      userId: "", // Will be set by caller
      fileName: "",
      extractedText,
      detectedFields,
      confidenceScores,
      documentType,
      status: "completed",
      processedAt: new Date(),
    };

    logger.info({ documentId, documentType }, "Document analysis completed");
    return result;
  } catch (error) {
    logger.error({ error, documentId }, "Failed to analyze document");
    return null;
  }
}

// Auto-fill form based on document analysis
export function generateAutoFillSuggestions(
  documentAnalysis: DocumentProcessing
): FormAutoFill[] {
  const suggestions: FormAutoFill[] = [];

  for (const [fieldName, value] of Object.entries(documentAnalysis.detectedFields)) {
    const confidence = documentAnalysis.confidenceScores[fieldName] || 0;
    
    if (confidence > 0.7) { // Only suggest high-confidence matches
      suggestions.push({
        fieldName,
        value: String(value),
        source: documentAnalysis.documentType,
        confidence,
      });
    }
  }

  return suggestions;
}

// Detect fields in document text
function detectFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Name detection
  const nameMatch = text.match(/name[:\s]+([A-Za-z\s]+)/i);
  if (nameMatch) fields.fullName = nameMatch[1].trim();

  // Email detection
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) fields.email = emailMatch[1];

  // Phone detection
  const phoneMatch = text.match(/(\+?1?\d{9,15})/);
  if (phoneMatch) fields.phone = phoneMatch[1];

  // Date of birth detection
  const dobMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
  if (dobMatch) fields.dateOfBirth = dobMatch[1];

  // Passport number
  const passportMatch = text.match(/passport[:\s]+([A-Z0-9]+)/i);
  if (passportMatch) fields.passportNumber = passportMatch[1];

  // Country detection
  const countryMatch = text.match(/country[:\s]+([A-Za-z\s]+)/i);
  if (countryMatch) fields.country = countryMatch[1].trim();

  // Visa type detection
  const visaMatch = text.match(/(work visa|student visa|tourist visa|business visa)/i);
  if (visaMatch) fields.visaType = visaMatch[1];

  return fields;
}

// Calculate confidence scores for detected fields
function calculateConfidence(fields: Record<string, string>): Record<string, number> {
  const confidence: Record<string, number> = {};

  for (const field of Object.keys(fields)) {
    // Base confidence varies by field type
    switch (field) {
      case "email":
        confidence[field] = 0.95; // Email regex is very reliable
        break;
      case "passportNumber":
        confidence[field] = 0.85; // Passport numbers have specific formats
        break;
      case "phone":
        confidence[field] = 0.75; // Phone numbers can be ambiguous
        break;
      case "fullName":
        confidence[field] = 0.7; // Name detection is moderate
        break;
      default:
        confidence[field] = 0.6; // Default moderate confidence
    }
  }

  return confidence;
}

// Classify document type
function classifyDocument(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("passport")) return "Passport";
  if (lowerText.includes("visa")) return "Visa";
  if (lowerText.includes("birth certificate")) return "Birth Certificate";
  if (lowerText.includes("degree") || lowerText.includes("certificate")) return "Education Document";
  if (lowerText.includes("employment") || lowerText.includes("job")) return "Employment Verification";
  if (lowerText.includes("bank") || lowerText.includes("statement")) return "Financial Document";
  if (lowerText.includes("insurance")) return "Insurance Document";
  if (lowerText.includes("medical") || lowerText.includes("health")) return "Medical Document";

  return "General Document";
}

// Validate document completeness
export function validateDocumentCompletion(
  requiredFields: string[],
  documentAnalysis: DocumentProcessing
): { complete: boolean; missingFields: string[]; percentage: number } {
  const detectedFieldNames = Object.keys(documentAnalysis.detectedFields);
  const missingFields = requiredFields.filter((f) => !detectedFieldNames.includes(f));
  const complete = missingFields.length === 0;
  const percentage = ((detectedFieldNames.length / requiredFields.length) * 100) || 0;

  return { complete, missingFields, percentage };
}

// Get document quality score
export function calculateDocumentQuality(
  documentAnalysis: DocumentProcessing
): number {
  let score = 0;
  const confidenceValues = Object.values(documentAnalysis.confidenceScores);
  
  if (confidenceValues.length === 0) return 0;
  
  // Average confidence contributes 50% to quality
  const avgConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;
  score += avgConfidence * 50;
  
  // Number of fields detected contributes 30%
  const fieldCount = Object.keys(documentAnalysis.detectedFields).length;
  score += Math.min((fieldCount / 10) * 30, 30);
  
  // Document type classification contributes 20%
  if (documentAnalysis.documentType !== "General Document") {
    score += 20;
  }
  
  return Math.round(score);
}

// Extract structured data from document
export function extractStructuredData(
  documentAnalysis: DocumentProcessing
): Record<string, any> {
  return {
    documentType: documentAnalysis.documentType,
    extractedText: documentAnalysis.extractedText,
    fields: documentAnalysis.detectedFields,
    confidence: documentAnalysis.confidenceScores,
    quality: calculateDocumentQuality(documentAnalysis),
    extractedAt: documentAnalysis.processedAt,
  };
}
