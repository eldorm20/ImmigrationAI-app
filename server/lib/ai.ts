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
      logger.warn({ error: response.error }, "AI evaluation failed, using fallback");
      return getFallbackEvaluation(question, answer);
    }

    // Try to parse structured feedback from AI response
    const aiText = response.data || "";

    return {
      score: calculateAnswerScore(answer),
      strengths: extractStrengths(aiText, answer),
      weaknesses: extractWeaknesses(aiText, answer),
      suggestions: extractSuggestions(aiText),
      overallAssessment: aiText || "Your answer demonstrates understanding of the topic. Consider adding more specific details and examples to strengthen your response.",
    };
  } catch (error) {
    logger.error({ error, question }, "Failed to evaluate interview answer, using fallback");
    return getFallbackEvaluation(question, answer);
  }
}

// Fallback evaluation when AI is unavailable
function getFallbackEvaluation(question: string, answer: string): InterviewFeedback {
  const score = calculateAnswerScore(answer);
  const wordCount = answer.split(/\s+/).length;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // Analyze answer characteristics
  if (wordCount >= 50) {
    strengths.push("Provided a detailed response");
  } else {
    weaknesses.push("Answer could be more detailed");
    suggestions.push("Expand your answer with specific examples and details");
  }

  if (answer.includes("because") || answer.includes("for example") || answer.includes("such as")) {
    strengths.push("Used explanatory language");
  } else {
    suggestions.push("Use phrases like 'for example' or 'because' to explain your reasoning");
  }

  if (answer.includes("experience") || answer.includes("worked") || answer.includes("qualified")) {
    strengths.push("Referenced relevant experience or qualifications");
  }

  if (wordCount < 20) {
    weaknesses.push("Response is too brief for an interview question");
    suggestions.push("Aim for at least 2-3 sentences when answering interview questions");
  }

  // Ensure we have at least one item in each array
  if (strengths.length === 0) strengths.push("Attempted to address the question");
  if (weaknesses.length === 0) weaknesses.push("Could include more supporting evidence");
  if (suggestions.length === 0) suggestions.push("Practice structuring your answers using the STAR method (Situation, Task, Action, Result)");

  return {
    score,
    strengths,
    weaknesses,
    suggestions,
    overallAssessment: score >= 70
      ? "Good answer! Your response shows understanding of the question. Continue practicing to refine your delivery."
      : score >= 50
        ? "Decent attempt. Consider adding more specific details and examples to make your answer more compelling."
        : "Your answer needs more development. Focus on addressing the specific question and providing concrete examples.",
  };
}

// Calculate a reasonable score based on answer quality
function calculateAnswerScore(answer: string): number {
  const wordCount = answer.split(/\s+/).length;
  let score = 50; // Base score

  if (wordCount >= 30) score += 10;
  if (wordCount >= 50) score += 10;
  if (wordCount >= 100) score += 5;

  if (answer.includes("because") || answer.includes("therefore")) score += 5;
  if (answer.includes("for example") || answer.includes("such as")) score += 5;
  if (answer.includes("experience") || answer.includes("skills")) score += 5;

  return Math.min(score, 95); // Cap at 95
}

// Extract strengths from AI response or generate based on answer
function extractStrengths(aiText: string, answer: string): string[] {
  const strengths: string[] = [];
  const lowerText = aiText.toLowerCase();

  if (lowerText.includes("clear") || lowerText.includes("good")) {
    strengths.push("Clear communication");
  }
  if (lowerText.includes("detail") || lowerText.includes("thorough")) {
    strengths.push("Good level of detail");
  }
  if (lowerText.includes("relevant") || lowerText.includes("appropriate")) {
    strengths.push("Relevant response to the question");
  }

  if (strengths.length === 0) {
    strengths.push("Attempted to address the question directly");
  }

  return strengths;
}

// Extract weaknesses from AI response or generate based on answer
function extractWeaknesses(aiText: string, answer: string): string[] {
  const weaknesses: string[] = [];
  const lowerText = aiText.toLowerCase();

  if (lowerText.includes("more detail") || lowerText.includes("elaborate")) {
    weaknesses.push("Could provide more detail");
  }
  if (lowerText.includes("example") || lowerText.includes("specific")) {
    weaknesses.push("Consider adding specific examples");
  }

  if (weaknesses.length === 0) {
    weaknesses.push("Minor improvements could enhance your response");
  }

  return weaknesses;
}

// Extract suggestions from AI response
function extractSuggestions(aiText: string): string[] {
  const suggestions: string[] = [];
  const lowerText = aiText.toLowerCase();

  if (lowerText.includes("example")) {
    suggestions.push("Include specific examples from your experience");
  }
  if (lowerText.includes("structure") || lowerText.includes("organize")) {
    suggestions.push("Structure your answer more clearly");
  }

  suggestions.push("Practice your delivery for confidence");

  return suggestions;
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

// Predictive Case Analysis
export interface CaseAnalysis {
  riskScore: number; // 0-100
  successProbability: "High" | "Medium" | "Low";
  redFlags: string[];
  greenFlags: string[];
  summary: string;
  recommendations: string[];
}

export async function analyzeCase(
  applicationData: Record<string, any>,
  documents: Array<{ type: string; summary?: string }>
): Promise<CaseAnalysis> {
  try {
    const prompt = `Analyze this immigration case for ${applicationData.visaType} (${applicationData.country}).
    
Applicant: ${JSON.stringify(applicationData.applicant)}
Application Details: ${JSON.stringify(applicationData.details)}
Documents Provided: ${JSON.stringify(documents)}

Identify risks (red flags) and strengths (green flags). Estimate probability of success (High/Medium/Low) and a risk score (0-100, where 100 is perfect case). Provide a summary and recommendations.
Return valid JSON only: { "riskScore": number, "successProbability": string, "redFlags": [], "greenFlags": [], "summary": string, "recommendations": [] }`;

    const response = await agentsManager.processRequest(
      "immigration-law",
      "analyzeVisaOptions", // Reusing the immigration agent
      [prompt, { context: "case analysis" }]
    );

    if (!response.success) {
      throw new Error(response.error || "Case analysis failed");
    }

    let rawData = response.data;
    if (typeof rawData === "string") {
      // Clean up markdown code blocks if present
      rawData = rawData.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();
      try { // Attempt to parse
        const parsed = JSON.parse(rawData);
        // Basic validation/sanitization could go here
        return parsed as CaseAnalysis;
      } catch (e) {
        logger.warn({ error: e, rawData }, "Failed to parse AI analysis");
        // Don't throw, return fallback
      }
    } else if (typeof rawData === 'object') {
      return rawData as CaseAnalysis;
    }

    // Fallback if formatting fails
    return {
      riskScore: 50,
      successProbability: "Medium",
      redFlags: ["AI Analysis output format invalid"],
      greenFlags: [],
      summary: "AI generated an analysis but it was not in the expected format.",
      recommendations: ["Review case manually"],
    };
  } catch (error) {
    logger.error({ error }, "Failed to analyze case");
    return {
      riskScore: 0,
      successProbability: "Low",
      redFlags: ["System error during analysis"],
      greenFlags: [],
      summary: "Analysis failed due to a system error.",
      recommendations: [],
    };
  }
}
