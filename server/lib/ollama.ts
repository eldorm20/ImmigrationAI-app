/**
 * Ollama Integration Module
 * Optimized for immigration law tasks using local LLMs
 * Supports document generation, translation, Q&A, and analysis
 */

import { logger } from "./logger";

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

const OLLAMA_URL = process.env.LOCAL_AI_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

/**
 * Call Ollama with optimized parameters for immigration AI tasks
 */
export async function callOllama(
  prompt: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number; // max tokens
  }
): Promise<string> {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: fullPrompt,
        stream: false,
        // Ollama parameters for better results
        temperature: options?.temperature ?? 0.7,
        top_k: options?.top_k ?? 40,
        top_p: options?.top_p ?? 0.9,
        num_predict: options?.num_predict ?? 512, // reasonable limit
      }),
      timeout: 120000, // 2 min timeout for Ollama
    });

    if (!response.ok) {
      throw new Error(
        `Ollama error: ${response.status} ${response.statusText}`
      );
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error) {
    logger.error({ error, url: OLLAMA_URL }, "Ollama API call failed");
    throw error;
  }
}

/**
 * Document Generator - Create immigration documents
 */
export async function generateImmigrationDocument(
  documentType: string,
  applicantData: {
    name: string;
    nationality: string;
    passportNumber: string;
    visaType: string;
    purpose: string;
    details: string;
  }
): Promise<string> {
  const systemPrompt = `You are a professional immigration document writer. 
Create formal, legally sound ${documentType} for immigration applications.
Use professional legal language. Be concise and clear.
Format the document properly with dates, addresses, and signatures where needed.`;

  const prompt = `Generate a ${documentType} for:
- Applicant: ${applicantData.name}
- Nationality: ${applicantData.nationality}
- Passport: ${applicantData.passportNumber}
- Visa Type: ${applicantData.visaType}
- Purpose: ${applicantData.purpose}
- Details: ${applicantData.details}

Create a complete, formal document ready for submission.`;

  return callOllama(prompt, systemPrompt, {
    temperature: 0.3, // Lower temp for consistency in formal docs
    num_predict: 1000,
  });
}

/**
 * Translator - Translate immigration documents
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const systemPrompt = `You are a professional translator specializing in immigration documents.
Translate accurately while preserving legal meaning and formatting.
Maintain the tone and structure of the original document.`;

  const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}.
Keep the formatting and legal structure intact.

${text}

Provide only the translation, no explanations.`;

  return callOllama(prompt, systemPrompt, {
    temperature: 0.3, // Lower for consistency
    num_predict: text.length * 1.2, // Scale with input
  });
}

/**
 * Interview Q&A Generator - Create practice questions
 */
export async function generateInterviewQuestions(
  visaType: string,
  country: string,
  experience?: string
): Promise<string[]> {
  const systemPrompt = `You are an immigration consultant who prepares applicants for visa interviews.
Create realistic, challenging interview questions that test knowledge and credibility.`;

  const prompt = `Generate 8-10 interview questions for a ${visaType} visa interview to ${country}.
${experience ? `Applicant background: ${experience}` : ""}

Format: One question per line, numbered.`;

  const response = await callOllama(prompt, systemPrompt, {
    temperature: 0.6,
    num_predict: 800,
  });

  // Parse the response into array
  return response
    .split("\n")
    .filter((q) => q.trim())
    .map((q) => q.replace(/^\d+\.\s*/, "").trim());
}

/**
 * Eligibility Analyzer - Assess visa chances
 */
export async function analyzeEligibility(
  applicantData: {
    nationality: string;
    visaType: string;
    education: string;
    workExperience: number;
    financialStatus: string;
    languageLevel: string;
  }
): Promise<{
  eligible: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}> {
  const systemPrompt = `You are an immigration lawyer reviewing visa eligibility.
Provide honest, actionable assessment based on visa requirements.
Format response as JSON with keys: eligible (boolean), score (0-100), issues (array), recommendations (array).`;

  const prompt = `Assess ${applicantData.visaType} visa eligibility for:
- Nationality: ${applicantData.nationality}
- Education: ${applicantData.education}
- Work Experience: ${applicantData.workExperience} years
- Financial Status: ${applicantData.financialStatus}
- Language Level: ${applicantData.languageLevel}

Respond ONLY with valid JSON, no markdown or explanations.`;

  const response = await callOllama(prompt, systemPrompt, {
    temperature: 0.2, // Very low for consistent structured output
    num_predict: 400,
  });

  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    logger.warn("Failed to parse eligibility response as JSON");
  }

  // Fallback
  return {
    eligible: true,
    score: 70,
    issues: ["Unable to fully assess - please consult a lawyer"],
    recommendations: ["Gather all required documentation"],
  };
}

/**
 * Document Analysis - Review and extract info from documents
 */
export async function analyzeDocumentContent(
  documentContent: string,
  documentType: string
): Promise<{
  extractedData: Record<string, string>;
  issues: string[];
  quality: "excellent" | "good" | "poor";
  suggestions: string[];
}> {
  const systemPrompt = `You are an immigration document analyst.
Review documents for completeness, accuracy, and compliance.
Format response as JSON with keys: extractedData (object), issues (array), quality (string), suggestions (array).`;

  const prompt = `Analyze this ${documentType}:

${documentContent.substring(0, 2000)} ${documentContent.length > 2000 ? "..." : ""}

Extract key information and identify issues.
Respond ONLY with valid JSON.`;

  const response = await callOllama(prompt, systemPrompt, {
    temperature: 0.2,
    num_predict: 600,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    logger.warn("Failed to parse document analysis as JSON");
  }

  return {
    extractedData: {},
    issues: ["Unable to fully analyze - please review manually"],
    quality: "poor",
    suggestions: ["Upload a clearer copy of the document"],
  };
}

/**
 * Chat/Consultation - General immigration Q&A
 */
export async function chatWithImmigrationConsultant(
  userMessage: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are an experienced immigration consultant.
Provide helpful, accurate, but general immigration advice.
Always recommend consulting with a licensed lawyer for specific legal advice.
Be empathetic and clear in your responses.`;

  const prompt = context
    ? `Context: ${context}\n\nUser Question: ${userMessage}`
    : userMessage;

  return callOllama(prompt, systemPrompt, {
    temperature: 0.7,
    num_predict: 600,
  });
}

/**
 * Health check - Verify Ollama is running
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL.replace("/api/generate", "")}/api/tags`, {
      method: "GET",
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  callOllama,
  generateImmigrationDocument,
  translateText,
  generateInterviewQuestions,
  analyzeEligibility,
  analyzeDocumentContent,
  chatWithImmigrationConsultant,
  checkOllamaHealth,
};
