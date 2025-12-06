import OpenAI from "openai";
import { logger } from "./logger";

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const hasHuggingFace = Boolean(process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL);

if (!hasOpenAI && !hasHuggingFace) {
  logger.warn("No AI provider configured (OPENAI_API_KEY or HUGGINGFACE_API_TOKEN+HF_MODEL). Using local fallbacks.");
}

const openai = hasOpenAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function generateTextWithHuggingFace(prompt: string, max_tokens = 512, temperature = 0.7) {
  const token = process.env.HUGGINGFACE_API_TOKEN as string;
  if (!token) throw new Error("Hugging Face token not configured (HUGGINGFACE_API_TOKEN)");

  // Allow a custom self-hosted inference endpoint (e.g., text-generation-inference)
  const customUrl = process.env.HF_INFERENCE_URL;
  const model = process.env.HF_MODEL as string;

  const body = { inputs: prompt, parameters: { max_new_tokens: max_tokens, temperature } };

  const url = customUrl || (model ? `https://api-inference.huggingface.co/models/${model}` : null);
  if (!url) throw new Error("Neither HF_INFERENCE_URL nor HF_MODEL configured for Hugging Face inference");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Hugging Face inference error: ${res.status} ${t}`);
  }

  const json = await res.json();
  // HF inference may return { generated_text: "..." } or an array of objects
  if (typeof json === "string") return json;
  if (Array.isArray(json) && json[0] && typeof json[0].generated_text === "string") return json[0].generated_text;
  if (json.generated_text) return json.generated_text as string;
  // Some TGI/self-hosted endpoints return { generated_text } nested differently
  if (json[0] && json[0].generated_text) return json[0].generated_text as string;
  // fallback: attempt to stringify
  return JSON.stringify(json);
}

async function generateText(prompt: string, max_tokens = 512, temperature = 0.7) {
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: (process.env.OPENAI_MODEL as string) || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an assistant that responds in JSON when asked." },
          { role: "user", content: prompt },
        ],
        temperature,
      });
      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");
      return content;
    } catch (err) {
      logger.error({ err }, "OpenAI request failed, falling back if possible");
      if (hasHuggingFace) return generateTextWithHuggingFace(prompt, max_tokens, temperature);
      throw err;
    }
  }

  if (hasHuggingFace) {
    return generateTextWithHuggingFace(prompt, max_tokens, temperature);
  }

  throw new Error("No AI provider available");
}

// Visa Eligibility Checker
export interface EligibilityQuestion {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "boolean";
  options?: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  probability: number; // 0-100
  missingDocuments: string[];
  issues: string[];
  recommendations: string[];
  nextSteps: string[];
}

const ELIGIBILITY_QUESTIONS: EligibilityQuestion[] = [
  {
    id: "country",
    question: "Which country are you applying to?",
    type: "select",
    options: ["UK", "Germany", "USA", "Canada", "Australia", "Other"],
  },
  {
    id: "visaType",
    question: "What type of visa are you applying for?",
    type: "select",
    options: [
      "Skilled Worker",
      "Student",
      "Tourist",
      "Business",
      "Family",
      "Opportunity Card",
    ],
  },
  {
    id: "age",
    question: "What is your age?",
    type: "number",
  },
  {
    id: "education",
    question: "What is your highest level of education?",
    type: "select",
    options: [
      "High School",
      "Bachelor's Degree",
      "Master's Degree",
      "PhD",
      "Other",
    ],
  },
  {
    id: "workExperience",
    question: "How many years of work experience do you have?",
    type: "number",
  },
  {
    id: "languageProficiency",
    question: "Do you have language proficiency certificates?",
    type: "boolean",
  },
  {
    id: "jobOffer",
    question: "Do you have a job offer?",
    type: "boolean",
  },
  {
    id: "financialSupport",
    question: "Do you have sufficient financial support?",
    type: "boolean",
  },
];

export function getEligibilityQuestions(): EligibilityQuestion[] {
  return ELIGIBILITY_QUESTIONS;
}

export async function checkEligibility(
  answers: Record<string, any>
): Promise<EligibilityResult> {
  // If no provider configured, return a deterministic helpful fallback
  if (!hasOpenAI && !hasHuggingFace) {
    return {
      eligible: true,
      probability: 75,
      missingDocuments: ["Passport", "Educational certificates"],
      issues: [],
      recommendations: [
        "Ensure all documents are translated and certified",
        "Prepare financial statements",
      ],
      nextSteps: ["Gather required documents", "Schedule consultation with lawyer"],
    };
  }

  try {
    const prompt = `You are an immigration expert. Analyze the following visa application details and provide a comprehensive assessment:\n\nCountry: ${answers.country}\nVisa Type: ${answers.visaType}\nAge: ${answers.age}\nEducation: ${answers.education}\nWork Experience: ${answers.workExperience} years\nLanguage Proficiency: ${answers.languageProficiency ? "Yes" : "No"}\nJob Offer: ${answers.jobOffer ? "Yes" : "No"}\nFinancial Support: ${answers.financialSupport ? "Yes" : "No"}\n\nProvide a JSON response with:\n1. eligible: boolean - whether the applicant is likely eligible\n2. probability: number (0-100) - success probability percentage\n3. missingDocuments: array of strings - documents that are missing or need to be obtained\n4. issues: array of strings - potential issues or concerns\n5. recommendations: array of strings - actionable recommendations\n6. nextSteps: array of strings - immediate next steps\n\nReturn ONLY valid JSON, no additional text.`;

    const content = await generateText(prompt, 512, 0.7);
    const result = JSON.parse(content) as EligibilityResult;
    return result;
  } catch (error) {
    logger.error({ error, answers }, "Failed to check eligibility");
    throw new Error("Failed to analyze eligibility");
  }
}

// Document Analyzer
export interface DocumentAnalysis {
  documentType: string;
  extractedData: Record<string, any>;
  issues: string[];
  quality: "excellent" | "good" | "poor";
  suggestions: string[];
  missingFields: string[];
}

export async function analyzeDocument(
  documentUrl: string,
  documentType: string,
  ocrData?: Record<string, any>
): Promise<DocumentAnalysis> {
  if (!hasOpenAI && !hasHuggingFace) {
    return {
      documentType,
      extractedData: ocrData || {},
      issues: [],
      quality: "good",
      suggestions: ["Ensure document is clear and readable"],
      missingFields: [],
    };
  }

  try {
    const prompt = `Analyze this ${documentType} document for a visa application.\n\nOCR Extracted Data: ${JSON.stringify(
      ocrData || {}
    )}\n\nProvide a JSON response with:\n1. documentType: string - confirmed document type\n2. extractedData: object - key information extracted\n3. issues: array of strings - problems found (blurry, missing info, inconsistencies, etc.)\n4. quality: "excellent" | "good" | "poor" - overall document quality\n5. suggestions: array of strings - how to improve the document\n6. missingFields: array of strings - required fields that are missing\n\nReturn ONLY valid JSON.`;

    const content = await generateText(prompt, 512, 0.5);
    const result = JSON.parse(content) as DocumentAnalysis;
    return result;
  } catch (error) {
    logger.error({ error, documentType }, "Failed to analyze document");
    throw new Error("Failed to analyze document");
  }
}

// Interview Simulator
export interface InterviewQuestion {
  question: string;
  category: string;
  expectedAnswer: string;
}

export interface InterviewFeedback {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallAssessment: string;
}

export async function generateInterviewQuestions(
  visaType: string,
  country: string
): Promise<InterviewQuestion[]> {
  if (!hasOpenAI && !hasHuggingFace) {
    return [
      { question: "Why do you want to visit this country?", category: "Purpose", expectedAnswer: "Clear purpose and intent" },
      { question: "What is your current occupation?", category: "Background", expectedAnswer: "Honest and detailed response" },
    ];
  }

  try {
    const prompt = `Generate 5-8 realistic visa interview questions for a ${visaType} visa to ${country}.\n\nFor each question, provide:\n- question: the interview question\n- category: the category (Purpose, Background, Financial, Ties, etc.)\n- expectedAnswer: what a good answer should include\n\nReturn as JSON array.`;

    const content = await generateText(prompt, 512, 0.8);
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch (error) {
    logger.error({ error, visaType, country }, "Failed to generate interview questions");
    return [];
  }
}

export async function evaluateInterviewAnswer(
  question: string,
  answer: string
): Promise<InterviewFeedback> {
  if (!hasOpenAI && !hasHuggingFace) {
    return {
      score: 75,
      strengths: ["Clear communication"],
      weaknesses: ["Could be more detailed"],
      suggestions: ["Provide specific examples"],
      overallAssessment: "Good answer, but could be improved",
    };
  }

  try {
    const prompt = `Evaluate this visa interview answer:\n\nQuestion: ${question}\nAnswer: ${answer}\n\nProvide JSON with:\n1. score: number (0-100) - quality score\n2. strengths: array of strings - what was good\n3. weaknesses: array of strings - what needs improvement\n4. suggestions: array of strings - how to improve\n5. overallAssessment: string - brief overall feedback\n\nReturn ONLY valid JSON.`;

    const content = await generateText(prompt, 256, 0.6);
    const result = JSON.parse(content) as InterviewFeedback;
    return result;
  } catch (error) {
    logger.error({ error, question }, "Failed to evaluate interview answer");
    throw new Error("Failed to evaluate answer");
  }
}







