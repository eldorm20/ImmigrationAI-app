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

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Status endpoint to report AI provider availability
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const hasLocalAI = Boolean(process.env.LOCAL_AI_URL);
    const hasOpenAI = false; // OpenAI disabled — using open-source providers only
    const hasHF = Boolean(process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL);
    const hfModel = process.env.HF_MODEL || null;
    const localUrl = process.env.LOCAL_AI_URL || null;

    res.json({
      providers: {
        local: hasLocalAI ? { enabled: true, url: localUrl } : { enabled: false },
        openai: hasOpenAI ? { enabled: true } : { enabled: false },
        huggingface: hasHF ? { enabled: true, model: hfModel } : { enabled: false },
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
      const msg = err?.message || String(err);
      if (msg.includes('No AI provider')) {
        return res.status(503).json({ message: 'AI provider not configured. Please set OPENAI_API_KEY or HUGGINGFACE_API_TOKEN in environment.' });
      }
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

    const translation = await translateText(fromLang, toLang, text);
    res.json({ translation });
  })
);

// Chat endpoint
router.post(
  "/chat",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { message, language } = z.object({ message: z.string().min(1), language: z.string().optional() }).parse(req.body);
    const reply = await chatRespond(message, language || 'en');
    res.json({ reply });
  })
);

// Proxy / simple generate endpoint to call Hugging Face Inference API or custom HF_INFERENCE_URL
router.post(
  "/proxy",
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    const hfModel = process.env.HF_MODEL;
    const hfUrl = process.env.HF_INFERENCE_URL || (hfModel ? `https://api-inference.huggingface.co/models/${hfModel}` : undefined);

    if (!hfUrl) {
      return res.status(400).json({ error: 'No Hugging Face model configured (set HF_MODEL or HF_INFERENCE_URL)' });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

    try {
      const r = await fetch(hfUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const text = await r.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch (_) { json = text; }
      if (!r.ok) {
        return res.status(502).json({ error: 'Hugging Face error', details: json });
      }

      return res.json({ result: json });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to call Hugging Face', details: err?.message || String(err) });
    }
  })
);

export default router;







