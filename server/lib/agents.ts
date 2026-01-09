/**
 * AI Agents System for ImmigrationAI
 * Handles specialized agents for immigration law, customer service, document analysis, etc.
 * Uses open-source models and can work offline or with external providers
 */

import { logger } from "./logger";
import { db } from "../db";
import { researchArticles, users, applications, roadmapItems, documentPacks } from "../../shared/schema";
import { eq, or, ilike, sql, cosineDistance, desc } from "drizzle-orm";
import { OpenAI } from "openai";
import { getQueryEmbedding } from "./agents-utils.ts";
import { RagClient } from "./rag-client";

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  source?: string;
}

export interface AgentConfig {
  name: string;
  role: string;
  expertise: string[];
  instructions: string;
  fallbacks: string[];
}

/**
 * Base Agent Class
 */
class Agent {
  protected name: string;
  protected role: string;
  protected expertise: string[];
  protected instructions: string;
  protected fallbacks: string[];

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.role = config.role;
    this.expertise = config.expertise;
    this.instructions = config.instructions;
    this.fallbacks = config.fallbacks;
  }

  protected getSystemPrompt(): string {
    return `You are ${this.name}, a specialized ${this.role} AI assistant.
Your expertise: ${this.expertise.join(", ")}.
${this.instructions}
Always provide accurate, professional, and legally compliant information.`;
  }

  protected getContext(): string {
    return `You are an expert in: ${this.expertise.join(", ")}.
Fallback responses if uncertain: ${this.fallbacks.join("; ")}.`;
  }

  protected async generateResponse(prompt: string): Promise<string> {
    // Try configured AI provider first
    try {
      const response = await generateTextWithProvider(prompt, this.getSystemPrompt());
      if (!response || response.trim().length === 0) {
        throw new Error("Empty response from AI provider");
      }
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, agent: this.name, error: errorMsg },
        `AI provider failed for ${this.name}: ${errorMsg}`
      );
      // Don't use fallback - propagate error so caller knows AI failed
      throw err;
    }
  }

  protected getFallbackResponse(): string {
    const fallback = this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
    return fallback;
  }

  async process(input: string, context?: any): Promise<AgentResponse> {
    try {
      const response = await this.generateResponse(input);
      return {
        success: true,
        data: response,
        source: this.name,
      };
    } catch (err) {
      logger.error({ err, agent: this.name, context }, `Error in ${this.name}`);
      return {
        success: false,
        error: `Agent ${this.name} failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        source: this.name,
      };
    }
  }
}

/**
 * Immigration Law Agent
 */
class ImmigrationLawAgent extends Agent {
  constructor() {
    super({
      name: "Immigration Law Specialist",
      role: "immigration law expert",
      expertise: [
        "EU immigration law",
        "Visa requirements",
        "Residency permits",
        "Work authorization",
        "Family reunion",
        "Asylum procedures",
      ],
      instructions: `You are an expert Immigration Lawyer (AI Verification Level: High).
Your goal is to provide accurate, citable, and professional advice regarding UK, German, US, and Canadian immigration law.

**Core Directives:**
1.  **Role**: Act as a senior immigration attorney. Your tone should be authoritative yet accessible.
2.  **Legal Disclaimer**: You MUST PREFACE specific legal advice with: "While I am an AI legal assistant based on current regulations, this does not constitute formal legal counsel. For critical applications, please consult one of our verifiable human lawyers."
3.  **Jurisdiction**: specific advice varies by country. always clarify which country's laws you are citing (e.g., "Under UK Home Office rules..." or "Per US USCIS guidelines...").

**Interaction Guidelines:**
1.  **Analysis**: When asked about eligibility, analyze the user's profile against specific visa tiers (e.g., UK Skilled Worker vs. Global Talent).
2.  **Red Flags**: Proactively identify potential refusal reasons (e.g., "A gap in employment might require explanation" or "Salary below threshold").
3.  **Document Specificity**: Be precise about documents (e.g., "Bank statements must be dated within 28 days" rather than just "Bank statements").
4.  **Multilingual**: Respond in the user's preferred language (EN/DE/UZ/RU/ES/FR), maintaining professional legal terminology in that language.

**Knowledge Base:**
- **UK**: Skilled Worker, Global Talent, Spouse/Partner, Student (CAS), Indefinite Leave to Remain (ILR).
- **Germany**: Opportunity Card (Chancenkarte), Blue Card EU, Job Seeker.
- **USA**: H-1B, O-1, Green Card (EB-1/EB-2), L-1.
- **Canada**: Express Entry, PNP, Start-up Visa.
- **General**: Asylum protocols, Family reunification, Schengen rules.

If the user asks about non-immigration topics, politely redirect to immigration matters.`,
      fallbacks: [
        "To ensure accuracy for your specific case, I recommend scheduling a consultation with one of our human lawyers.",
        "Immigration rules are complex and subject to change. Please verify with official government sources (GOV.UK, USCIS, BAMF, IRCC).",
        "Based on general requirements, you likely need a valid passport, proof of funds, and a clean criminal record, but specific requirements vary by visa.",
      ],
    });
  }

  async analyzeVisaOptions(applicantData: {
    nationality: string;
    qualifications: string[];
    income: number;
    familyStatus: string;
  }): Promise<AgentResponse> {
    // RAG Integration: Fetch authoritative options for the specific nationality/jurisdiction
    let authoritativeOptions = "";
    try {
      const jurisdiction = "UK"; // Default context
      const ragRes = await RagClient.search(`Visa options for ${applicantData.nationality} with ${applicantData.qualifications.join(", ")}`, jurisdiction);
      if (ragRes.length > 0) {
        authoritativeOptions = "\nAuthoritative Visa Options & Policy:\n" +
          ragRes.map(r => r.content).join("\n");
      }
    } catch (err) {
      logger.warn({ err }, "RAG search failed for analyzeVisaOptions");
    }

    const prompt = `Based on the following profile, what are the best visa options?
- Nationality: ${applicantData.nationality}
- Qualifications: ${applicantData.qualifications.join(", ")}
- Annual Income: €${applicantData.income}
- Family Status: ${applicantData.familyStatus}

${authoritativeOptions}

Provide specific visa categories with success probability and required steps.`;


    return this.process(prompt);
  }

  async checkDocumentRequirements(visaType: string): Promise<AgentResponse> {
    // RAG Integration: Fetch official document checklist
    let officialChecklist = "";
    try {
      const ragRes = await RagClient.search(`Document requirements for ${visaType} visa`, "UK");
      if (ragRes.length > 0) {
        officialChecklist = "\nOfficial UK Government Requirements:\n" +
          ragRes.map(r => r.content).join("\n");
      }
    } catch (err) {
      logger.warn({ err }, "RAG search failed for checkDocumentRequirements");
    }

    const prompt = `List all required documents for ${visaType} visa application. Include:
1. Personal documents
2. Financial documents
3. Health documents
4. Employment documents (if applicable)
For each, mention if it needs notarization or translation.

${officialChecklist}`;


    return this.process(prompt);
  }

  async generateInterviewQuestions(visaType: string, country: string): Promise<AgentResponse> {
    // RAG Integration: Fetch real officer guidance or common refusal reasons for interview context
    let officerGuidance = "";
    try {
      const ragRes = await RagClient.search(`Immigration officer interview guidance for ${visaType} in ${country}`, country);
      if (ragRes.length > 0) {
        officerGuidance = "\nAuthoritative Interview Context & Guidance:\n" +
          ragRes.map(r => r.content).join("\n");
      }
    } catch (err) {
      logger.warn({ err }, "RAG search failed for generateInterviewQuestions");
    }

    const prompt = `Generate 5 realistic interview questions for a ${visaType} for the country ${country}.
${officerGuidance}

Return the response ONLY as a JSON array of objects with the following structure:
[
  {
    "text": "The question itself",
    "category": "e.g., Personal, Financial, Professional",
    "expectedAnswer": "Brief summary of what a good answer should include"
  }
]
Do not include any other text or explanations before or after the JSON.`;


    return this.process(prompt);
  }

  async handleVoiceInterview(prompt: string, context?: any): Promise<AgentResponse> {
    // For voice, we want speed. Skip RAG if the prompt already contains context or if it's a follow-up.
    // The prompt passed from simulateVoiceConversation already has interviewContext.
    return this.process(prompt);
  }

  async handleUserQuery(query: string, context?: any): Promise<AgentResponse> {
    // 1. Primary Source: Authoritative RAG Microservice
    let authoritativeContext = "";
    let citations: any[] = [];

    try {
      const jurisdiction = context?.jurisdiction || "UK";
      const ragResponse = await RagClient.getAnswer(query, jurisdiction);
      authoritativeContext = ragResponse.answer;
      citations = ragResponse.citations;
    } catch (err) {
      logger.warn({ err }, "RagClient failed, falling back to local DB index");
    }

    // 2. Secondary/Fallback Source: Local Database RAG (for UZ specifically)
    let localContext = "";
    try {
      const embedding = await getQueryEmbedding(query);
      let relevantDocs: any[] = [];

      if (embedding) {
        relevantDocs = await db.select({
          id: researchArticles.id,
          title: researchArticles.title,
          summary: researchArticles.summary,
          sourceUrl: researchArticles.sourceUrl,
          similarity: sql<number>`1 - (${cosineDistance(researchArticles.embedding, embedding)})`
        })
          .from(researchArticles)
          .orderBy((t) => desc(sql`1 - (${cosineDistance(researchArticles.embedding, embedding)})`))
          .limit(2);
      }

      if (relevantDocs.length > 0) {
        localContext = "\nAdditional Local Legal Context:\n" +
          relevantDocs.map(doc => `Document: ${doc.title}\nContent: ${doc.summary}\nSource: ${doc.sourceUrl}`).join("\n\n");
      }
    } catch (err) {
      logger.warn({ err }, "Local RAG retrieval failed");
    }

    const lang = context?.language || "en";
    const prompt = `
Authoritative Immigration Information:
${authoritativeContext}

${localContext}

User Question: "${query}"

Instructions: 
1. Respond in ${lang}. 
2. Synthesize a helpful answer using the provided authoritative and local context.
3. If authoritative context includes numbers like [1], [2], preserve them.
4. Conclude with a list of citations found in context (Source URLs, Titles).
5. Maintain a professional and expert tone.
`;

    return this.process(prompt);
  }

  async analyzeScenario(prompt: string, options?: any): Promise<AgentResponse> {
    const result = await this.process(prompt);
    if (!result.success) return result;

    try {
      let rawData = result.data;
      if (typeof rawData === "string") {
        rawData = rawData.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();
        result.data = JSON.parse(rawData);
      }
    } catch (e) {
      logger.warn({ error: e }, "Failed to parse scenario analysis JSON");
    }
    return result;
  }

  async reviewDoc(prompt: string, options?: any): Promise<AgentResponse> {
    const result = await this.process(prompt);
    if (!result.success) return result;

    try {
      let rawData = result.data;
      if (typeof rawData === "string") {
        rawData = rawData.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();
        result.data = JSON.parse(rawData);
      }
    } catch (e) {
      logger.warn({ error: e }, "Failed to parse document review JSON");
    }
    return result;
  }

  /**
   * Specialist method for multi-step case strategy development
   * (Dify-inspired Iterative Reasoning)
   */
  async developCaseStrategy(query: string, context?: any): Promise<AgentResponse> {
    logger.info({ agent: this.name, query }, "Developing complex case strategy");

    // Step 1: Planning - Identify what we need to know
    const planPrompt = `User Query: "${query}"
Analyze this immigration query and identify:
1. The likely visa routes involved.
2. 3 critical pieces of legal information we need to retrieve.
3. The specific jurisdiction (UK, Germany, etc.).

Return JSON: { "routes": [], "infoNeeded": [], "jurisdiction": "string" }`;

    const planRes = await this.process(planPrompt);
    let planData: any = { routes: ["general"], infoNeeded: [query], jurisdiction: "UK" };

    try {
      if (planRes.success) {
        const raw = planRes.data.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();
        planData = JSON.parse(raw);
      }
    } catch (e) {
      logger.warn({ error: e }, "Failed to parse initial case plan");
    }

    // Step 2: Search - Execute RAG for each info need
    let legalBase = "";
    for (const need of planData.infoNeeded) {
      try {
        const ragRes = await RagClient.getAnswer(need, planData.jurisdiction);
        legalBase += `\n--- Research for "${need}" ---\n${ragRes.answer}\n`;
      } catch (err) {
        logger.warn({ err, need }, "Iterative RAG search failed");
      }
    }

    // Step 3: Synthesis - Final specialized answer
    const finalPrompt = `Legal Framework:
${legalBase}

User Request: "${query}"

Based on the legal framework above, develop a comprehensive immigration strategy for the user.
Include:
1. Recommended Visa Route
2. Success Likelihood
3. Key Mandatory Documents
4. Potential Challenges (Red Flags)

Respond in a professional, legally-structured format.`;

    return this.process(finalPrompt, { iterative: true });
  }
}

/**
 * Customer Service Agent
 */
class CustomerServiceAgent extends Agent {
  constructor() {
    super({
      name: "Customer Support Specialist",
      role: "customer service representative",
      expertise: [
        "Account management",
        "Troubleshooting",
        "Payment issues",
        "Technical support",
        "General inquiries",
        "Complaint resolution",
      ],
      instructions: `You are a dedicated Customer Support and Technical Support specialist for the ImmigrationAId platform.
When assisting users:
1. **Greetings**: Always start with a warm, professional greeting.
2. **Empathy**: Be empathetic and professional. Acknowledge the user's frustration if they are having issues.
3. **Clarity**: Provide clear, step-by-step solutions for platform navigation or account issues.
4. **Tech Support**: If a user reports a bug (like "page not loading" or "error 500"), explain that our engineering team is notified and suggest clearing cache or refreshing.
5. **Solutions**: Offer multiple solutions when possible.
6. **Escalation**: Escalate to human support when needed (advise them to email support@immigrationai.com).
7. **Follow-up**: Ask if there is anything else they need help with.`,
      fallbacks: [
        "I'm having trouble with that. Please contact our support team at support@immigrationai.com for immediate assistance.",
        "For account-related issues, please verify your identity first, then I can help you with your concern.",
        "That seems to be a technical issue. Our team is investigating. Please try again in a few minutes.",
      ],
    });
  }

  async handleUserQuery(query: string, context?: any): Promise<AgentResponse> {
    const contextStr = context ? `Context: ${JSON.stringify(context)}` : "";
    const prompt = `A customer has the following question: "${query}"
${contextStr}
Provide a helpful, clear response. If it's technical, provide troubleshooting steps.`;

    return this.process(prompt);
  }

  async resolvePaymentIssue(issueType: string, details: string): Promise<AgentResponse> {
    const prompt = `A customer is experiencing a payment issue:
Type: ${issueType}
Details: ${details}
Provide step-by-step resolution instructions.`;

    return this.process(prompt);
  }
}

/**
 * Document Analysis Agent
 */
class DocumentAnalysisAgent extends Agent {
  constructor() {
    super({
      name: "Document Analysis Specialist",
      role: "document analyst",
      expertise: [
        "Document OCR and extraction",
        "Data validation",
        "Document verification",
        "Information accuracy",
        "Completeness checking",
        "Format standards",
      ],
      instructions: `When analyzing documents:
1. Extract all relevant information
2. Validate data against known standards
3. Flag missing or inconsistent information
4. Provide recommendations for corrections
5. Note any suspicious patterns
6. Score document completeness (0-100%)`,
      fallbacks: [
        "Unable to analyze document fully. Please ensure it's clear, legible, and in a supported format (PDF, JPG, PNG).",
        "Document appears incomplete. Please verify all required sections are included.",
        "Data extracted with low confidence. Please review and confirm accuracy.",
      ],
    });
  }

  async analyzeDocument(
    documentType: string,
    extractedData: Record<string, any>,
    visaType?: string
  ): Promise<AgentResponse> {
    // RAG Implementation: Find official requirements for this document type
    let complianceChecklist = "";
    try {
      const jurisdiction = "UK"; // Default to UK context
      const searchResults = await RagClient.search(`Requirements for ${documentType} in ${visaType || 'general'} application`, jurisdiction);
      if (searchResults.length > 0) {
        complianceChecklist = "\nOfficial Compliance Requirements:\n" +
          searchResults.map(r => r.content).join("\n");
      }
    } catch (err) {
      logger.warn({ err }, "RAG search failed in DocumentAnalysisAgent");
    }

    const prompt = `Analyze the extracted data from a ${documentType} for a ${visaType || 'visa'}.
    
    Extracted Data: ${JSON.stringify(extractedData)}
    
    ${complianceChecklist}
    
    Verify if the extracted data meets the official requirements.
    Identify missing fields, validity issues, or potential red flags.
    
    Return JSON: { "completenessScore": number, "isValid": boolean, "missingFields": [], "redFlags": [], "summary": "string" }`;

    return this.process(prompt);
  }

  async validateInformation(
    documentType: string,
    field: string,
    value: string
  ): Promise<AgentResponse> {
    const prompt = `Is this value valid for ${documentType} document, field "${field}": "${value}"?
Explain why or why not, and suggest corrections if needed.`;

    return this.process(prompt);
  }
}

/**
 * Legal Compliance Agent
 */
class LegalComplianceAgent extends Agent {
  constructor() {
    super({
      name: "Legal Compliance Officer",
      role: "legal compliance expert",
      expertise: [
        "EU regulations",
        "Data protection (GDPR)",
        "Immigration law compliance",
        "Contract legality",
        "Privacy standards",
        "Document authenticity",
      ],
      instructions: `When checking compliance:
1. Reference specific EU regulations
2. Identify any compliance gaps
3. Provide corrective actions
4. Note critical vs. minor issues
5. Estimate compliance risk level
6. Recommend professional legal review if needed`,
      fallbacks: [
        "For complex legal compliance matters, please consult a qualified legal professional.",
        "This may violate EU regulations. Please review with legal counsel before proceeding.",
        "Compliance status: Generally acceptable, but verify with current regulations.",
      ],
    });
  }

  async checkCompliance(
    documentType: string,
    documentData: Record<string, any>
  ): Promise<AgentResponse> {
    const prompt = `Check legal and regulatory compliance for a ${documentType}:
Data: ${JSON.stringify(documentData, null, 2)}

Evaluate compliance with:
1. EU GDPR requirements
2. Immigration regulations
3. Document authenticity standards
4. Data protection laws
Provide a compliance score (0-100) and action items.`;

    return this.process(prompt);
  }

  async assessDataProtection(dataType: string): Promise<AgentResponse> {
    const prompt = `What are the GDPR data protection requirements for ${dataType}?
Include:
1. Storage requirements
2. Access controls
3. Retention periods
4. User rights
5. Breach notification requirements`;

    return this.process(prompt);
  }
}

/**
 * Language Translation Agent
 */
class LanguageTranslationAgent extends Agent {
  constructor() {
    super({
      name: "Professional Translator",
      role: "professional language translator",
      expertise: [
        "Document translation",
        "Legal terminology",
        "Cultural adaptation",
        "Quality assurance",
        "Multiple language pairs",
        "Certified translation",
      ],
      instructions: `When translating:
1. Maintain accurate meaning and context
2. Use proper terminology for legal documents
3. Preserve formatting
4. Note any untranslatable terms
5. Provide quality score
6. Suggest certified translator if needed for official documents`,
      fallbacks: [
        "Translation unable to complete. Please check source text is valid.",
        "For certified translations, a professional translator must review.",
        "This term doesn't have a direct translation. Suggest: [closest equivalent]",
      ],
    });
  }

  async translateDocument(
    content: string,
    fromLang: string,
    toLang: string,
    certified: boolean = false
  ): Promise<AgentResponse> {
    const prompt = `${certified ? "Provide a certified translation (note this for official use)" : "Translate"} the following text from ${fromLang} to ${toLang}:

"${content}"

Provide:
1. Translation
2. Quality confidence (0-100%)
3. Any terminology notes
4. ${certified ? "Certification statement" : "Improvement suggestions"}`;

    return this.process(prompt);
  }
}

/**
 * AI Agents Manager
 */
export class AIAgentsManager {
  private agents: Map<string, Agent>;

  constructor() {
    // Initialize map and set entries individually to avoid TypeScript tuple inference issues
    this.agents = new Map<string, Agent>();
    this.agents.set("immigration-law", new ImmigrationLawAgent());
    this.agents.set("customer-service", new CustomerServiceAgent());
    this.agents.set("document-analysis", new DocumentAnalysisAgent());
    this.agents.set("legal-compliance", new LegalComplianceAgent());
    this.agents.set("translation", new LanguageTranslationAgent());
  }

  getAgent(agentType: string): Agent | null {
    return this.agents.get(agentType) || null;
  }

  getAllAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  async processRequest(
    agentType: string,
    method: string,
    params: any[],
    context?: any
  ): Promise<AgentResponse> {
    const agent = this.getAgent(agentType);

    if (!agent) {
      return {
        success: false,
        error: `Agent type "${agentType}" not found`,
      };
    }

    try {
      const agentMethod = (agent as any)[method];
      if (typeof agentMethod !== "function") {
        return {
          success: false,
          error: `Method "${method}" not available in agent "${agentType}"`,
        };
      }

      // If method is handleUserQuery, use context
      if (method === "handleUserQuery" && context) {
        return await agentMethod.call(agent, params[0], context);
      }

      const result = await agentMethod.apply(agent, params);
      return result;
    } catch (err) {
      logger.error({ err, agentType, method }, "Agent processing error");
      return {
        success: false,
        error: `Failed to process request: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }
}

// Export singleton instance
export const agentsManager = new AIAgentsManager();


/**
 * Helper function to generate text with provider
 */
async function generateTextWithProvider(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL || process.env.OLLAMA_LOCAL_URL;
  const hasLocalAI = Boolean(localAIUrl);

  // Enable OpenAI if key is present
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHuggingFace = Boolean(
    process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL
  );

  // Prefer a local AI server if configured (Ollama, local inference server, etc.)
  if (hasLocalAI) {
    try {
      // Use Ollama adapter helpers when available
      const { buildOllamaPayload, parseOllamaResponse } = await import("./ollama");
      const model = process.env.OLLAMA_MODEL || 'mistral'; // Default to mistral if not set
      logger.info({ model, provider: "ollama" }, "Generating text using local AI provider");

      const bodyPayload: any = buildOllamaPayload(prompt, systemPrompt, model);

      // FIX: Ensure URL ends with the correct endpoint
      let fetchUrl = localAIUrl as string;
      const baseUrl = fetchUrl.replace(/\/+$/, "");

      if (baseUrl.endsWith("/api/generate") || baseUrl.endsWith("/api/chat")) {
        fetchUrl = baseUrl;
      } else if (baseUrl.endsWith("/api")) {
        fetchUrl = `${baseUrl}/generate`;
      } else if (!baseUrl.includes("/api/") && !baseUrl.includes("/v1/")) {
        fetchUrl = `${baseUrl}/api/generate`;
      }

      // Retry logic: Try up to 2 times
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for CPU inference

          const res = await fetch(fetchUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errorBody = await res.text().catch(() => "Could not read error body");
            logger.error({
              status: res.status,
              statusText: res.statusText,
              url: fetchUrl,
              body: errorBody
            }, "Ollama request failed with error status");

            if (res.status === 404) {
              logger.warn("Ollama returned 404. This often means the model is not found or the endpoint path is incorrect.");
            }

            if (attempt === 1) {
              logger.info("Local AI request failed, retrying...");
              continue;
            }
            throw new Error(`AI Provider configured but failed to respond. Status: ${res.status}`);
          }

          // Try parse JSON
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            const parsed = parseOllamaResponse(j);
            if (parsed) return parsed;

            // Fallbacks
            if (j.text) return j.text;
            if (j.result) return j.result;
            if (Array.isArray(j.choices) && j.choices[0]?.text) return j.choices[0].text;
            if (j.output && Array.isArray(j.output) && j.output[0]?.content) {
              return String(j.output[0].content || JSON.stringify(j.output));
            }
            return JSON.stringify(j);
          }

          return await res.text();
        } catch (innerErr) {
          if (attempt === 2) throw innerErr; // Rethrow on last attempt
          logger.warn({ err: innerErr, attempt }, "Local AI request failed, retrying...");
          // Wait 1s before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err) {
      logger.warn({ err }, "Local AI provider failed after retries, falling back");
      // continue to other providers
    }
  }

  // OpenAI fallback (if key is configured)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices[0]?.message?.content || "";
      }
      logger.warn({ status: res.status }, "OpenAI fallback failed");
    } catch (err) {
      logger.warn({ err }, "OpenAI request failed");
    }
  }

  if (hasHuggingFace) {
    try {
      return await generateWithHuggingFace(`${systemPrompt}\n\n${prompt}`);
    } catch (err) {
      logger.warn({ err }, "Hugging Face provider failed");
    }
  }

  // Try free HuggingFace models that don't require authentication
  const freeModels = [
    'microsoft/DialoGPT-medium',
    'facebook/blenderbot-400M-distill',
  ];

  for (const model of freeModels) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt.slice(0, 500), parameters: { max_new_tokens: 256 } })
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json[0]?.generated_text) {
          return json[0].generated_text;
        }
        if (json.generated_text) {
          return json.generated_text;
        }
      }
    } catch (err) {
      logger.warn({ err, model }, 'Free HuggingFace model failed');
    }
  }


  throw new Error(`AI Provider configured but failed to respond. Local: ${hasLocalAI}, OpenAI: ${hasOpenAI}, HF: ${hasHuggingFace}`);
}

/**
 * Hugging Face text generation
 */
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN as string;
  const model = process.env.HF_MODEL as string;
  const customUrl = process.env.HF_INFERENCE_URL;

  const url = customUrl || `https://api-inference.huggingface.co/models/${model}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 512, temperature: 0.7 },
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json[0]?.generated_text) return json[0].generated_text;
      if (json.generated_text) return json.generated_text;
      return JSON.stringify(json);
    }
  } catch (err) {
    logger.warn({ err }, "HF Inference API failed");
  }

  throw new Error("Hugging Face generation failed");
}

// Orchestrator instance
import { AgentOrchestrator } from "./orchestrator";
export const orchestrator = new AgentOrchestrator(agentsManager);
