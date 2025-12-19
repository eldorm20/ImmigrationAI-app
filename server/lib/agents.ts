/**
 * AI Agents System for ImmigrationAI
 * Handles specialized agents for immigration law, customer service, document analysis, etc.
 * Uses open-source models and can work offline or with external providers
 */

import { logger } from "./logger";

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

  async process(input: string): Promise<AgentResponse> {
    try {
      const response = await this.generateResponse(input);
      return {
        success: true,
        data: response,
        source: this.name,
      };
    } catch (err) {
      logger.error({ err, agent: this.name }, `Error in ${this.name}`);
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
Your goal is to provide accurate, citable, and professional advice regarding UK and German immigration law.

**Guidelines:**
1.  **Legal Disclaimer**: Always imply (or state) that you are an AI assistant, not a human solicitor, but your training is based on official Home Office/Bundestag regulations.
2.  **Accuracy**: If you are unsure about a specific visa requirement (e.g., minimum salary thresholds), state the general rule and advise verifying current numbers on official government sites.
3.  **Tone**: Professional, empathetic, and precise. Avoid casual slang.
4.  **Structure**: Use bullet points for requirements.
5.  **Multilingual**: Respond in the language the user asks (EN/DE/UZ/RU).

**Knowledge Base**:
- UK Skilled Worker Visa (tier 2)
- German Opportunity Card (Chancenkarte)
- Blue Card EU
- Student Visas
- Family Unification

If the user asks about something unrelated (e.g., cooking recipes), politely decline and steer back to immigration.`,
      fallbacks: [
        "For accurate immigration information, please consult official government immigration websites or licensed immigration lawyers.",
        "EU visa requirements vary by country. Generally, you'll need a valid passport, proof of funds, and travel documentation.",
        "Processing times typically range from 2-12 weeks depending on visa type and country.",
      ],
    });
  }

  async analyzeVisaOptions(applicantData: {
    nationality: string;
    qualifications: string[];
    income: number;
    familyStatus: string;
  }): Promise<AgentResponse> {
    const prompt = `Based on the following profile, what are the best visa options?
- Nationality: ${applicantData.nationality}
- Qualifications: ${applicantData.qualifications.join(", ")}
- Annual Income: €${applicantData.income}
- Family Status: ${applicantData.familyStatus}

Provide specific visa categories with success probability and required steps.`;

    return this.process(prompt);
  }

  async checkDocumentRequirements(visaType: string): Promise<AgentResponse> {
    const prompt = `List all required documents for ${visaType} visa application in the EU. Include:
1. Personal documents
2. Financial documents
3. Health documents
4. Employment documents (if applicable)
For each, mention if it needs notarization or translation.`;

    return this.process(prompt);
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
      instructions: `When assisting customers:
1. Be empathetic and professional
2. Provide clear, step-by-step solutions
3. Offer multiple solutions when possible
4. Escalate to human support when needed
5. Document issues for improvement
6. Follow up with solutions`,
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
    extractedData: Record<string, any>
  ): Promise<AgentResponse> {
    const prompt = `Analyze the following ${documentType} document data:
${JSON.stringify(extractedData, null, 2)}

Provide:
1. Completeness score (0-100)
2. Missing required fields
3. Data consistency issues
4. Format compliance
5. Recommendations`;

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
    params: any[]
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

/**
 * Helper function to generate text with provider
 */
async function generateTextWithProvider(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL || process.env.OLLAMA_LOCAL_URL;
  const hasLocalAI = Boolean(localAIUrl);
<<<<<<< HEAD
  // OpenAI usage enabled if key is present
=======
  // Enable OpenAI if key is present
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHuggingFace = Boolean(
    process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL
  );

  // Prefer a local AI server if configured (Ollama, local inference server, etc.)
  if (hasLocalAI) {
    try {
      // Use Ollama adapter helpers when available
      const { buildOllamaPayload, parseOllamaResponse } = await import("./ollama");

      const bodyPayload: any = buildOllamaPayload(prompt, systemPrompt, process.env.OLLAMA_MODEL);

      // FIX: Ensure URL ends with /api/generate only if it doesn't already have a path component
      let fetchUrl = localAIUrl as string;
      if (!fetchUrl.includes("/api/") && !fetchUrl.includes("/v1/")) {
        fetchUrl = fetchUrl.replace(/\/+$/, "") + "/api/generate";
      } else if (fetchUrl.endsWith("/v1/chat/completions")) {
        // Support OpenAI-compatible local endpoints
        // Adapt payload if needed, or assume the user configured it correctly
      }

      const res = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Local AI error: ${res.status} ${text}`);
      }

      // Try parse JSON, prefer specialized Ollama parsing
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();

        // First try the Ollama parser
        const parsed = parseOllamaResponse(j);
        if (parsed) return parsed;

        // Fallback heuristics for other local providers
        if (j.text) return j.text;
        if (j.result) return j.result;
        if (Array.isArray(j.choices) && j.choices[0]?.text) return j.choices[0].text;
        if (j.output && Array.isArray(j.output) && j.output[0]?.content) {
          return String(j.output[0].content || JSON.stringify(j.output));
        }

        // fallback to stringified JSON
        return JSON.stringify(j);
      }

      return await res.text();
    } catch (err) {
      logger.warn({ err }, "Local AI provider failed, falling back");
      // continue to other providers
    }
  }

  // OpenAI fallback (if key is configured)
  if (process.env.OPENAI_API_KEY) {
    try {
      // Basic OpenAI implementation without heavy SDK
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
      return await generateWithHuggingFace(
        `${systemPrompt}\n\n${prompt}`
      );
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

<<<<<<< HEAD
  // Intelligent pre-built responses for common immigration queries
  logger.info("Using intelligent response system for: " + prompt.substring(0, 50) + "...");

  const lowerPrompt = prompt.toLowerCase();

  // Immigration-specific intelligent responses
  if (lowerPrompt.includes('visa') || lowerPrompt.includes('viza')) {
    if (lowerPrompt.includes('uk') || lowerPrompt.includes('britain') || lowerPrompt.includes('england')) {
      return `For UK visa applications, you'll typically need:

1. **Valid Passport** - Must be valid for at least 6 months
2. **Proof of Funds** - Bank statements showing sufficient funds
3. **Employment/Study Letter** - Confirmation from employer or educational institution
4. **Accommodation Details** - Where you'll be staying
5. **TB Test Certificate** - Required for stays over 6 months

The processing time varies: Standard (3 weeks), Priority (5 days), Super Priority (24 hours for additional fee).

📝 Would you like me to help you prepare any specific documents?`;
    }

    if (lowerPrompt.includes('germany') || lowerPrompt.includes('german')) {
      return `For German visa/residence permit applications:

1. **Opportunity Card (Chancenkarte)** - For job seekers with qualifications
2. **Skilled Worker Visa** - Requires job offer matching your qualifications
3. **EU Blue Card** - For highly qualified professionals (salary threshold: €58,400/year)

**Key Documents:**
- University degree (must be recognized in Germany)
- Proof of German language skills (B1 or higher preferred)
- Health insurance coverage
- Proof of accommodation

Processing time: Usually 4-12 weeks through the German embassy.

🔍 Which visa category interests you?`;
    }
  }

  if (lowerPrompt.includes('document') || lowerPrompt.includes('hujjat')) {
    return `Here are the commonly required immigration documents:

📋 **Personal Documents:**
- Valid passport (6+ months validity)
- Birth certificate
- Marriage certificate (if applicable)
- Police clearance certificate

📋 **Financial Documents:**
- Bank statements (last 6 months)
- Salary slips
- Tax returns
- Sponsorship letter (if applicable)

📋 **Employment/Education:**
- Employment letter
- Degree certificates
- Professional certifications

📋 **Additional:**
- Passport photos (biometric)
- Travel itinerary
- Accommodation proof

💡 **Tip:** All documents should be translated and notarized if not in the destination country's language.`;
  }

  if (lowerPrompt.includes('translation') || lowerPrompt.includes('tarjima')) {
    return `For immigration documents, you typically need:

✅ **Certified/Official Translation** - Required for legal documents
✅ **Notarized Translation** - May be required for some countries
✅ **Apostille** - International authentication for documents

Common documents requiring translation:
- Birth certificates
- Marriage/Divorce certificates  
- Educational diplomas
- Police clearances
- Bank statements

💡 Use our Translation feature to get AI-assisted translations, then have them certified by an official translator.`;
  }

  if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi ') || lowerPrompt.includes('hey')) {
    return "Hello! I am your immigration AI assistant. How can I help you today? I can assist with visa requirements, document preparation, or translations.";
  }

  if (lowerPrompt.includes('thank')) {
    return "You're welcome! Let me know if you need anything else.";
  }

  if (lowerPrompt.includes('status') || lowerPrompt.includes('check')) {
    return "To check your application status, please visit the Dashboard or the 'My Applications' section. I can explain the general process if you like.";
  }

  // Generic helpful response but dynamic
  return `I understand you're asking about "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}". 
  
Currently, I am operating in limited mode (offline/demo). I can answer specific questions about:
- **Visas** (UK, Germany, etc.)
- **Documents** (Requirements, Prep)
- **Translation** (General info)

For a fully interactive experience, an administrator needs to configure the AI Provider (Ollama or HuggingFace).`;


=======
  throw new Error(`AI Provider configured but failed to respond. Local: ${hasLocalAI}, OpenAI: ${hasOpenAI}, HF: ${hasHuggingFace}`);
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
}

/**
 * Hugging Face text generation
 */
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN as string;
  const model = process.env.HF_MODEL as string;
  const customUrl = process.env.HF_INFERENCE_URL;

  const url = customUrl || `https://api-inference.huggingface.co/models/${model}`;

  // Try the standard HF Inference API first
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`HF Inference failed: ${res.status} ${await res.text().catch(() => "")}`);
    }

    const json = await res.json();
    // HF Inference may return an array of generations or object with generated_text
    if (Array.isArray(json) && json[0]?.generated_text) return json[0].generated_text;
    if ((json as any).generated_text) return (json as any).generated_text;
    // Some model endpoints return [{generated_text}] or { generated_text }
    if (Array.isArray(json) && json[0]?.generated_text) return json[0].generated_text;
    // Fallback to stringified response
    return JSON.stringify(json);
  } catch (err) {
    logger.warn({ err }, "HF Inference API failed, trying TGI-style /generate endpoint");
  }

  // If HF Inference failed, try Text-Generation-Inference (TGI) compatible /generate
  try {
    const tgiUrl = url.endsWith("/") ? `${url}generate` : `${url}/generate`;
    const res2 = await fetch(tgiUrl, {
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

    if (!res2.ok) {
      throw new Error(`TGI /generate failed: ${res2.status} ${await res2.text().catch(() => "")}`);
    }

    const j2 = await res2.json();
    // TGI often returns { generated_text } or { results: [{ text }] }
    if ((j2 as any).generated_text) return (j2 as any).generated_text;
    if (Array.isArray(j2?.results) && j2.results[0]?.text) return j2.results[0].text;
    if (Array.isArray(j2) && j2[0]?.generated_text) return j2[0].generated_text;
    if (j2?.data && Array.isArray(j2.data) && j2.data[0]?.generated_text) return j2.data[0].generated_text;
    return JSON.stringify(j2);
  } catch (err) {
    logger.warn({ err }, "TGI-style generation failed");
    throw new Error(`Hugging Face generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Export singleton instance
export const agentsManager = new AIAgentsManager();
