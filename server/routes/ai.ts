import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter, aiLimiter } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import {
  getEligibilityQuestions,
  checkEligibility,
  analyzeDocument,
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  analyzeScenario,
  generateDocument,
  reviewDocument,
  translateText,
  chatRespond,
} from "../lib/ai";
import { incrementUsage } from "../lib/aiUsage";
import { db } from "../db";
import { documents, users } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { getUserSubscriptionTier, getTierFeatures } from "../lib/subscriptionTiers";
import { logger } from "../lib/logger";

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Status endpoint to report AI provider availability
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const localUrl = process.env.LOCAL_AI_URL || null;
    const hasLocalAI = Boolean(localUrl);

    res.json({
      providers: {
        local: hasLocalAI ? { enabled: true, url: localUrl, model: process.env.OLLAMA_MODEL || null } : { enabled: false },
      },
    });
  })
);

// Get eligibility questions
router.get(
  "/eligibility/questions",
  asyncHandler(async (req, res) => {
    const questions = getEligibilityQuestions();
    res.json({ questions });
  })
);

// Check eligibility
router.post(
  "/eligibility/check",
  asyncHandler(async (req, res) => {
    const answers = z.record(z.any()).parse(req.body);
    const result = await checkEligibility(answers);
    res.json(result);
  })
);

// Analyze document
router.post(
  "/documents/analyze/:documentId",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const analysis = await analyzeDocument(
      document.url,
      document.documentType || "unknown",
      document.ocrData || undefined
    );

    // Increment generic AI request usage (1 unit per analyze)
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      // If quota exceeded, return 403
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({ message: (err as any).message || 'AI quota exceeded' });
    }

    // Update document with analysis
    await db
      .update(documents)
      .set({ aiAnalysis: analysis })
      .where(eq(documents.id, documentId));

    res.json(analysis);
  })
);

// Generate interview questions
const interviewQuestionsSchema = z.object({
  visaType: z.string().min(1),
  country: z.string().min(1).max(25), // More flexible length
  language: z.string().optional() // Allow language field
});

router.post(
  "/interview/questions",
  aiLimiter,
  validateBody(interviewQuestionsSchema),
  asyncHandler(async (req, res) => {
    console.log('[AI Interview Questions] Request body:', req.body);
    const { visaType, country, language } = req.parsedBody as { visaType: string; country: string; language?: string };

    const userId = req.user!.userId;
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({ message: (err as any).message || 'AI quota exceeded' });
    }

    const questions = await generateInterviewQuestions(visaType, country, language || 'en');
    res.json({ questions });
  })
);

// Evaluate interview answer
router.post(
  "/interview/evaluate",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { question, answer } = z
      .object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
      .parse(req.body);

    const userId = req.user!.userId;
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({ message: (err as any).message || 'AI quota exceeded' });
    }

    const feedback = await evaluateInterviewAnswer(question, answer, (req.body as any).language || 'en');
    res.json(feedback);
  })
);



// Generate professional document via AI
router.post(
  "/documents/generate",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Increment document-generation usage and generic AI usage (both enforced)
    try {
      await incrementUsage(userId, 'aiDocumentGenerations', 1);
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({ message: (err as any).message || 'AI quota exceeded' });
    }

    const { template, data, language } = z
      .object({ template: z.string().min(1), data: z.record(z.any()).optional(), language: z.string().optional() })
      .parse(req.body);

    let doc;
    try {
      doc = await generateDocument(template, data || {}, language || 'en');
    } catch (err: any) {
      // Provide a clear service-level message if AI providers are not configured
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes('no ai provider') || msg.includes('provider available')) {
        return res.status(503).json({
          message: 'AI service unavailable. System administrator must configure LOCAL_AI_URL (for Ollama) or HUGGINGFACE_API_TOKEN.'
        });
      }
      // Provide clearer guidance when template validation fails
      if (msg.includes('template')) {
        return res.status(400).json({
          message: 'Invalid template or missing template field. See /api/ai/documents/templates for available templates.'
        });
      }
      if (msg.includes('quota') || msg.includes('rate limit')) {
        return res.status(429).json({
          message: 'Too many requests. Please wait a moment and try again.'
        });
      }
      if (msg.includes('timeout')) {
        return res.status(504).json({
          message: 'AI service request timed out. Please try again.'
        });
      }
      logger.error({ err, template }, 'Document generation failed');
      throw err;
    }

    // (Usage already incremented via incrementUsage)

    res.json({ document: doc });
  })
);

// Review document for compliance
router.post(
  "/documents/review",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(403).json({ message: 'AI quota exceeded' });
    }

    const { content, docType, visaType } = z
      .object({
        content: z.string().min(10),
        docType: z.string().min(1),
        visaType: z.string().optional()
      })
      .parse(req.body);

    const check = await reviewDocument(content, docType, visaType);
    res.json(check);
  })
);

// Analyze hypothetical scenario
router.post(
  "/simulator/analyze",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(403).json({ message: 'AI quota exceeded' });
    }

    const result = await analyzeScenario(req.body);
    res.json(result);
  })
);

// Return available templates and sample data for previewing
router.get(
  "/documents/templates",
  asyncHandler(async (_req, res) => {
    const templates = [
      {
        id: 'Motivation Letter',
        description: 'Formal motivation / cover letter for immigration or job application',
        sampleData: {
          name: 'Jane Applicant',
          role: 'Research Scientist',
          company: 'Institute of Advanced Studies',
          experience: '6',
          education: "Master's in Molecular Biology",
          skills: 'Research, Project Management, English C1',
          achievements: 'Published 3 papers in peer-reviewed journals'
        }
      },
      {
        id: 'CV Enhancement',
        description: 'Enhanced CV / professional summary optimized for visa/job applications',
        sampleData: {
          name: 'Olga Ivanova',
          role: 'Data Analyst',
          company: 'Analytics Co',
          experience: '4',
          education: "Bachelor's in Statistics",
          skills: 'Python, SQL, DataViz'
        }
      },
      {
        id: 'Reference Letter',
        description: 'Professional reference letter template',
        sampleData: {
          name: 'Tim Johnson',
          role: 'Project Manager',
          recommender: 'Anna Smith',
          achievements: 'Led product launches across EU'
        }
      }
    ];

    res.json({ templates });
  })
);

// Small HTML preview for lawyers to quickly test template generation
router.get(
  "/documents/preview",
  asyncHandler(async (req, res) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>AI Document Preview</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; padding: 24px;">
    <h2>AI Document Preview</h2>
    <p>Select a template and click Generate to preview the AI output.</p>
    <select id="template">
      <option value="Motivation Letter">Motivation Letter</option>
      <option value="CV Enhancement">CV Enhancement</option>
      <option value="Reference Letter">Reference Letter</option>
    </select>
    <br/><br/>
    <textarea id="data" rows="10" cols="80">{
  "name": "Jane Applicant",
  "role": "Research Scientist",
  "company": "Institute of Advanced Studies",
  "experience": "6",
  "education": "Master's in Molecular Biology",
  "skills": "Research, Project Management, English C1",
  "achievements": "Published 3 papers in peer-reviewed journals"
}</textarea>
    <br/><br/>
    <button id="gen">Generate</button>
    <pre id="out" style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border: 1px solid #ddd; margin-top: 12px;"></pre>

    <script>
      document.getElementById('gen').addEventListener('click', async () => {
        const tpl = (document.getElementById('template') as HTMLSelectElement).value;
        const dataText = (document.getElementById('data') as HTMLTextAreaElement).value;
        let parsed = {};
        try { parsed = JSON.parse(dataText); } catch(e) { alert('Invalid JSON in data'); return; }

        const token = '';

        const resp = await fetch('/api/ai/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: tpl, data: parsed })
        });

        const json = await resp.json();
        document.getElementById('out').textContent = json.document || JSON.stringify(json, null, 2);
      });
    </script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  })
);

// Translate text
router.post(
  "/translate",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Increment AI usage
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({
        message: (err as any).message || 'AI quota exceeded'
      });
    }

    const { fromLang, toLang, text } = z
      .object({ fromLang: z.string().min(2), toLang: z.string().min(2), text: z.string().min(1) })
      .parse(req.body);

    try {
      // Try to use Ollama directly for translation if available
      const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL;
      if (localAIUrl) {
        try {
          const { buildOllamaPayload, parseOllamaResponse } = await import("../lib/ollama");
          const systemPrompt = `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. Provide only the translation, no explanations or additional text.`;
          const payload = buildOllamaPayload(`Translate this text: ${text}`, systemPrompt, process.env.OLLAMA_MODEL || 'mistral');

          // Construct correct URL
          let fetchUrl = localAIUrl;
          if (!fetchUrl.includes("/api/") && !fetchUrl.includes("/v1/")) {
            fetchUrl = fetchUrl.replace(/\/+$/, "") + "/api/generate";
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000); // 5min timeout for Ollama on CPU

          const response = await fetch(fetchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const json = await response.json();
            const parsed = parseOllamaResponse(json);
            if (parsed) {
              return res.json({ translation: parsed.trim() });
            }
          }
        } catch (ollamaErr) {
          logger.warn({ err: ollamaErr }, "Ollama translation failed, falling back to agent");
        }
      }

      // Fallback to agent-based translation
      const translation = await translateText(fromLang, toLang, text);
      res.json({ translation });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, fromLang, toLang }, "Translation failed");

      // Return 503 if AI provider unavailable, 500 for other errors
      if (errorMsg.includes("No AI provider available") || errorMsg.includes("provider")) {
        return res.status(503).json({
          error: "Translation service unavailable",
          message: "AI provider not configured or unreachable. Please configure LOCAL_AI_URL (Ollama) or HuggingFace credentials."
        });
      }

      res.status(500).json({
        error: "Translation failed",
        message: errorMsg
      });
    }
  })
);

// Chat endpoint
router.post(
  "/chat",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Increment AI usage
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({
        message: (err as any).message || 'AI quota exceeded'
      });
    }

    // Accept either { message: string } or { messages: [{role,content}] } for compatibility
    const parsed = z
      .union([
        z.object({ message: z.string().min(1), language: z.string().optional(), history: z.array(z.object({ role: z.enum(['user', 'ai']), content: z.string() })).optional() }),
        z.object({ messages: z.array(z.object({ role: z.enum(['user', 'ai']), content: z.string() })).min(1), language: z.string().optional() })
      ])
      .parse(req.body as any) as any;

    try {
      let messageText = '';
      let history: Array<{ role: string, content: string }> = parsed.history || [];

      if (parsed.messages) {
        // Build message from last user message and use previous items as history
        const msgs = parsed.messages as Array<any>;
        history = msgs.slice(0, -1).map((m: any) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content
        }));
        const last = msgs[msgs.length - 1];
        messageText = last.role === 'user' ? last.content : '';
      } else {
        messageText = parsed.message;
      }

      // Use improved chat function that properly handles conversation history
      const language = (parsed.language as string) || 'en';
      const systemPrompt = `You are an expert immigration and visa assistant. Answer questions in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'}. Provide accurate, helpful information about visas, immigration processes, document requirements, and related topics. Be concise but thorough.`;

      // Build full conversation with history for context
      const allMessages = [
        ...history,
        { role: 'user', content: messageText }
      ];

      // Try to use Ollama with messages format if available
      const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL;
      if (localAIUrl) {
        try {
          const { buildOllamaPayload, parseOllamaResponse } = await import("../lib/ollama");

          // Use /api/chat endpoint if available (better for conversation)
          // Construct correct URL for chat
          let chatUrl = localAIUrl;
          if (chatUrl.includes("/api/generate")) {
            chatUrl = chatUrl.replace('/api/generate', '/api/chat');
          } else if (!chatUrl.includes("/api/") && !chatUrl.includes("/v1/")) {
            chatUrl = chatUrl.replace(/\/+$/, "") + "/api/chat";
          }
          const payload = buildOllamaPayload(messageText, systemPrompt, process.env.OLLAMA_MODEL || 'mistral', allMessages);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000); // 5min timeout for Ollama on CPU

          const response = await fetch(chatUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const json = await response.json();
            const parsed = parseOllamaResponse(json);
            if (parsed) {
              return res.json({ reply: parsed });
            }
          }
        } catch (ollamaErr) {
          logger.warn({ err: ollamaErr }, "Ollama chat endpoint failed, falling back to generate");
        }
      }

      // Fallback to standard chatRespond function
      const contextualMessage = history && history.length > 0
        ? `Previous conversation:\n${history.map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n')}\n\nUser: ${messageText}`
        : messageText;

      const reply = await chatRespond(contextualMessage, language);
      res.json({ reply });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Chat response failed");

      // Check if it's a configuration issue
      const isConfigError = !process.env.OPENAI_API_KEY && !process.env.LOCAL_AI_URL && !process.env.HUGGINGFACE_API_TOKEN;

      if (isConfigError) {
        return res.status(503).json({
          error: "AI Service Not Configured",
          message: "Please configure OPENAI_API_KEY or LOCAL_AI_URL in environment variables."
        });
      }

      // Return 503 if AI provider unavailable, 500 for other errors
      if (errorMsg.includes("No AI provider available") || errorMsg.includes("provider") || errorMsg.includes("ECONNREFUSED")) {
        return res.status(503).json({
          error: "Chat service unavailable",
          message: "AI provider is currently unreachable. If using Local AI, ensure it is running."
        });
      }

      res.status(500).json({
        error: "Chat response failed",
        message: "An unexpected error occurred while processing your request."
      });
    }
  })
);

export default router;







