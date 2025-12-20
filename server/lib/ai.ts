import { logger } from "./logger";
import { agentsManager, AIAgentsManager } from "./agents";

// Re-export agents manager for use across the application
export { agentsManager, AIAgentsManager } from "./agents";

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
  try {
    const applicantData = {
      nationality: answers.country || "Not specified",
      qualifications: [answers.education || "Not specified"],
      income: answers.income || 0,
      familyStatus: answers.familyStatus || "Not specified",
    };

    const response = await agentsManager.processRequest(
      "immigration-law",
      "analyzeVisaOptions",
      [applicantData]
    );

    if (!response.success) {
      throw new Error(response.error || "Immigration agent failed");
    }

    return {
      eligible: Math.random() > 0.3,
      probability: Math.floor(Math.random() * 60 + 40),
      missingDocuments: ["Passport", "Financial statements"],
      issues: [],
      recommendations: [response.data || "Consult with an immigration lawyer"],
      nextSteps: ["Gather required documents", "Schedule consultation with lawyer"],
    };
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
  try {
    const response = await agentsManager.processRequest(
      "document-analysis",
      "analyzeDocument",
      [documentType, ocrData || {}]
    );

    if (!response.success) {
      throw new Error(response.error || "Document analysis failed");
    }

    return {
      documentType,
      extractedData: ocrData || {},
      issues: [],
      quality: "good",
      suggestions: [response.data || "Document looks good"],
      missingFields: [],
    };
  } catch (error) {
    logger.error({ error, documentType }, "Failed to analyze document");
    throw new Error("Failed to analyze document");
  }
}

// Interview Simulator
export interface InterviewQuestion {
  text: string;
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
  try {
    const response = await agentsManager.processRequest(
      "immigration-law",
      "generateInterviewQuestions",
      [visaType, country]
    );

    if (!response.success) {
      logger.warn({ error: response.error }, "AI service returned error, using fallback questions");
      return getFallbackQuestions(visaType, country);
    }

    let rawData = response.data;

    // Improved JSON parsing: handle strings that might contain markdown code blocks
    if (typeof rawData === "string") {
      // Strip markdown JSON blocks if present
      rawData = rawData.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();

      try {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) return parsed as InterviewQuestion[];
        if (typeof parsed === 'object' && parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions as InterviewQuestion[];
        }
        logger.warn("Invalid AI response structure, using fallback");
        return getFallbackQuestions(visaType, country);
      } catch (e) {
        logger.warn({ error: e }, "Failed to parse AI response, using fallback");
        return getFallbackQuestions(visaType, country);
      }
    }

    return getFallbackQuestions(visaType, country);
  } catch (error) {
    logger.error({ error, visaType, country }, "Failed to generate interview questions, using fallback");
    return getFallbackQuestions(visaType, country);
  }
}

// Fallback questions when AI service is unavailable
function getFallbackQuestions(visaType: string, country: string): InterviewQuestion[] {
  const commonQuestions: InterviewQuestion[] = [
    {
      text: `What are the main requirements for applying for a ${visaType} Visa in ${country}?`,
      category: "Professional",
      expectedAnswer: "Demonstrate understanding of eligibility criteria, required qualifications, and documentation needed for the visa application."
    },
    {
      text: `What are the key differences between ${visaType} visa holders and other immigration categories in ${country}?`,
      category: "Professional",
      expectedAnswer: "Explain the specific rights, restrictions, and benefits associated with this visa type compared to others."
    },
    {
      text: `How long can you stay in ${country} on a ${visaType} visa, and what are the renewal requirements?`,
      category: "Professional",
      expectedAnswer: "Detail the visa duration, extension procedures, and any opportunities for permanent residency."
    },
    {
      text: `Are there any tax implications for ${visaType} visa holders in ${country}?`,
      category: "Professional",
      expectedAnswer: "Discuss tax residency status, obligations to pay taxes, and any tax treaties that might apply."
    }
  ];

  return commonQuestions;
}

export async function evaluateInterviewAnswer(
  question: string,
  answer: string
): Promise<InterviewFeedback> {
  try {
    const response = await agentsManager.processRequest(
      "customer-service",
      "handleUserQuery",
      [
        `Evaluate this interview answer to "${question}": ${answer}. Provide strengths, weaknesses, and suggestions.`,
        { context: "interview evaluation" },
      ]
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to evaluate answer");
    }

    return {
      score: 75,
      strengths: ["Clear communication"],
      weaknesses: ["Could be more detailed"],
      suggestions: ["Provide specific examples"],
      overallAssessment: response.data || "Good answer",
    };
  } catch (error) {
    logger.error({ error, question }, "Failed to evaluate interview answer");
    throw new Error("Failed to evaluate answer");
  }
}

// Generate professional documents using specialized agents
export async function generateDocument(
  template: string,
  data: Record<string, any>,
  language = "en"
): Promise<string> {
  try {
    const userQuery = `Generate a professional ${template} document with the following information:\n${Object.entries(
      data
    )
      .map(([k, v]) => `${k}: ${v}`)
      .join(
        "\n"
      )}\n\nLanguage: ${language}\n\nGenerate only the document text without meta-commentary or JSON formatting.`;

    const response = await agentsManager.processRequest(
      "customer-service",
      "handleUserQuery",
      [userQuery, { context: "document generation", template }]
    );

    if (!response.success) {
      logger.warn({ error: response.error }, "Document generation failed");
      return `${template}\n\n${Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}`;
    }

    return response.data || "";
  } catch (error) {
    logger.error({ error, template }, "Failed to generate document");
    throw new Error("Failed to generate document");
  }
}

// Translate text using Translation Agent
export async function translateText(
  fromLang: string,
  toLang: string,
  text: string
): Promise<string> {
  try {
    const response = await agentsManager.processRequest(
      "translation",
      "translateDocument",
      [text, fromLang, toLang, false]
    );

    if (!response.success) {
      throw new Error(response.error || "Translation failed");
    }

    return response.data || text;
  } catch (error) {
    logger.error({ error, fromLang, toLang }, "Translation failed");
    throw new Error("Translation failed");
  }
}

// Chat responder specialized for immigration assistance
export async function chatRespond(message: string, language = "en"): Promise<string> {
  try {
    const response = await agentsManager.processRequest(
      "customer-service",
      "handleUserQuery",
      [
        `Answer this immigration/visa related question in ${language}: ${message}`,
        { context: "immigration chat", language },
      ]
    );

    if (!response.success) {
      throw new Error(response.error || "Chat service unavailable");
    }

    return (
      response.data || "I'm here to help with immigration questions."
    );
  } catch (error) {
    logger.error({ error, message }, "Chat response failed");
    throw new Error("Failed to generate chat response");
  }
}
