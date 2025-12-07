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

// Document Generation
export interface DocumentGenerationRequest {
  type: "cover_letter" | "resume" | "sop" | "motivation_letter" | "cv";
  visaType: string;
  country: string;
  applicantName: string;
  applicantEmail: string;
  education?: string;
  experience?: string;
  skills?: string;
  targetRole?: string;
  personalStatement?: string;
}

export interface GeneratedDocument {
  title: string;
  content: string;
  generatedAt: string;
  format: "markdown" | "html" | "text";
}

export async function generateDocument(request: DocumentGenerationRequest): Promise<GeneratedDocument> {
  if (!hasOpenAI && !hasHuggingFace) {
    const fallbackContent = `${request.type.replace(/_/g, " ").toUpperCase()}\n\nApplicant: ${request.applicantName}\nVisa Type: ${request.visaType}\nTarget Country: ${request.country}\n\nThis is a template document. Please add your personal information and customize it according to your needs.`;
    return {
      title: `${request.type.replace(/_/g, " ")} - ${request.applicantName}`,
      content: fallbackContent,
      generatedAt: new Date().toISOString(),
      format: "text",
    };
  }

  try {
    const documentType = request.type.replace(/_/g, " ");
    const prompt = buildDocumentGenerationPrompt(request, documentType);

    const content = await generateText(prompt, 2000, 0.7);
    
    return {
      title: `${documentType} - ${request.applicantName}`,
      content: content,
      generatedAt: new Date().toISOString(),
      format: "markdown",
    };
  } catch (error) {
    logger.error({ error, documentType: request.type }, "Failed to generate document");
    throw new Error(`Failed to generate ${request.type.replace(/_/g, " ")}`);
  }
}

function buildDocumentGenerationPrompt(request: DocumentGenerationRequest, docType: string): string {
  const baseInfo = `
Applicant Name: ${request.applicantName}
Target Visa Type: ${request.visaType}
Target Country: ${request.country}
Education: ${request.education || "Not specified"}
Work Experience: ${request.experience || "Not specified"}
Key Skills: ${request.skills || "Not specified"}
Target Role: ${request.targetRole || "Not specified"}
Personal Statement: ${request.personalStatement || "Not specified"}`;

  const prompts: Record<string, string> = {
    "cover letter": `Generate a professional cover letter for a ${request.visaType} visa application to ${request.country}. ${baseInfo}

The cover letter should:
1. Be professional and formal
2. Clearly state the purpose of the application
3. Highlight relevant qualifications and experience
4. Express genuine interest in the visa type and country
5. Be 3-4 paragraphs long
6. End with call to action

Return the cover letter in markdown format with proper formatting.`,

    "resume": `Generate a professional resume/CV for a ${request.visaType} visa application to ${request.country}. ${baseInfo}

The resume should:
1. Have a clear structure with sections for contact, summary, education, experience, skills
2. Be tailored to highlight relevant qualifications for the visa type
3. Use action verbs and quantifiable achievements
4. Be ATS-friendly (applicant tracking system)
5. Be concise but comprehensive (1-2 pages worth)

Return in markdown format with clear section headers.`,

    "statement of purpose": `Generate a Statement of Purpose (SOP) for a ${request.visaType} visa application to ${request.country}. ${baseInfo}

The SOP should:
1. Be 500-700 words
2. Explain the motivation for choosing this visa type and country
3. Discuss academic/professional background
4. Outline future plans and goals
5. Explain how this opportunity aligns with long-term objectives
6. Be compelling and authentic

Return in markdown format.`,

    "motivation letter": `Generate a Motivation Letter for a ${request.visaType} visa application to ${request.country}. ${baseInfo}

The letter should:
1. Be 300-400 words
2. Express genuine interest and motivation
3. Highlight key strengths and achievements
4. Connect past experience with future goals
5. Be formal but personable
6. Include specific reasons for choosing this country/visa type

Return in markdown format.`,

    "cv": `Generate a comprehensive CV (Curriculum Vitae) for a ${request.visaType} visa application to ${request.country}. ${baseInfo}

The CV should:
1. Include all standard sections: personal info, professional summary, education, employment, skills, certifications
2. Be detailed and comprehensive (2-3 pages worth)
3. Highlight achievements and impacts
4. Be tailored to the visa requirements
5. Use professional formatting

Return in markdown format with clear section headers.`,
  };

  return prompts[docType] || prompts["cover letter"];
}







