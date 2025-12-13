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
  generateDocument,
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
const interviewQuestionsSchema = z.object({ visaType: z.string().min(1), country: z.string().length(2) });

router.post(
  "/interview/questions",
  aiLimiter,
  validateBody(interviewQuestionsSchema),
  asyncHandler(async (req, res) => {
    const { visaType, country } = req.parsedBody as { visaType: string; country: string };

    const userId = req.user!.userId;
    try {
      await incrementUsage(userId, 'aiMonthlyRequests', 1);
    } catch (err) {
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({ message: (err as any).message || 'AI quota exceeded' });
    }

    const questions = await generateInterviewQuestions(visaType, country);
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

    const feedback = await evaluateInterviewAnswer(question, answer);
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
          message: 'AI generation service is not available. Please contact support. (Missing provider configuration: LOCAL_AI_URL / OLLAMA_MODEL)'
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
    const { fromLang, toLang, text } = z
      .object({ fromLang: z.string().min(2), toLang: z.string().min(2), text: z.string().min(1) })
      .parse(req.body);

    try {
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
    const { message, language, history } = z.object({ 
      message: z.string().min(1), 
      language: z.string().optional(),
      history: z.array(z.object({
        role: z.enum(['user', 'ai']),
        content: z.string()
      })).optional()
    }).parse(req.body);
    
    try {
      // Build conversation context from history
      const conversationContext = history && history.length > 0 
        ? `Previous conversation:\n${history.map((m: any) => `${m.role === 'ai' ? 'Assistant' : 'User'}: ${m.content}`).join('\n')}\n\nUser: ` 
        : '';
      
      const contextualMessage = conversationContext + message;
      const reply = await chatRespond(contextualMessage, language || 'en');
      res.json({ reply });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, message }, "Chat response failed");
      
      // Return 503 if AI provider unavailable, 500 for other errors
      if (errorMsg.includes("No AI provider available") || errorMsg.includes("provider")) {
        return res.status(503).json({ 
          error: "Chat service unavailable",
          message: "AI provider not configured or unreachable. Please configure LOCAL_AI_URL (Ollama) or HuggingFace credentials."
        });
      }
      
      res.status(500).json({ 
        error: "Chat response failed",
        message: errorMsg
      });
    }
  })
);

export default router;







