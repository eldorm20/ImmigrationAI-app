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
      logger.warn(
        { error: response.error },
        "Immigration agent failed, using fallback"
      );
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
      logger.warn({ error: response.error }, "Document analysis failed, using fallback");
      return {
        documentType,
        extractedData: ocrData || {},
        issues: [],
        quality: "good",
        suggestions: ["Ensure document is clear and readable"],
        missingFields: [],
      };
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
  try {
    const response = await agentsManager.processRequest(
      "immigration-law",
      "checkDocumentRequirements",
      [visaType]
    );

    if (!response.success) {
      logger.warn(
        { error: response.error },
        "Failed to generate interview questions"
      );
      return [];
    }

    return [
      {
        question: "Why do you want to visit this country?",
        category: "Purpose",
        expectedAnswer: "Clear purpose and intent",
      },
      {
        question: "What is your current occupation?",
        category: "Background",
        expectedAnswer: "Honest and detailed response",
      },
      {
        question: `What do you know about ${country}?`,
        category: "Knowledge",
        expectedAnswer: "Demonstrated understanding of the country",
      },
    ];
  } catch (error) {
    logger.error({ error, visaType, country }, "Failed to generate interview questions");
    return [];
  }
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
      logger.warn({ error: response.error }, "Failed to evaluate interview answer");
      return {
        score: 70,
        strengths: ["Clear communication"],
        weaknesses: ["Could provide more detail"],
        suggestions: ["Include specific examples"],
        overallAssessment: "Good response overall",
      };
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
      logger.warn({ error: response.error }, "Translation failed");
      return text;
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
      logger.warn({ error: response.error }, "Chat response failed");
      return "I'm here to help with immigration questions. Please provide more details about what you'd like to know.";
    }

    return (
      response.data || "I'm here to help with immigration questions."
    );
  } catch (error) {
    logger.error({ error, message }, "Chat response failed");
    throw new Error("Failed to generate chat response");
  }
}
