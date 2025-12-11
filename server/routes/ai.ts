import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
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
import { db } from "../db";
import { documents, users } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { getUserSubscriptionTier, getTierFeatures } from "../lib/subscriptionTiers";

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Quick status endpoint to see which AI provider is configured
router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const providers: Record<string, boolean> = {
      openai: Boolean(process.env.OPENAI_API_KEY),
      huggingface: Boolean(process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL),
      hf_custom_url: Boolean(process.env.HF_INFERENCE_URL),
    };

    res.json({ providers, note: 'Set HUGGINGFACE_API_TOKEN and HF_MODEL to use local/hosted Hugging Face models.' });
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

    // Update document with analysis
    await db
      .update(documents)
      .set({ aiAnalysis: analysis })
      .where(eq(documents.id, documentId));

    res.json(analysis);
  })
);

// Generate interview questions
router.post(
  "/interview/questions",
  asyncHandler(async (req, res) => {
    const { visaType, country } = z
      .object({
        visaType: z.string().min(1),
        country: z.string().length(2),
      })
      .parse(req.body);

    const questions = await generateInterviewQuestions(visaType, country);
    res.json({ questions });
  })
);

// Evaluate interview answer
router.post(
  "/interview/evaluate",
  asyncHandler(async (req, res) => {
    const { question, answer } = z
      .object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
      .parse(req.body);

    const feedback = await evaluateInterviewAnswer(question, answer);
    res.json(feedback);
  })
);



// Generate professional document via AI
router.post(
  "/documents/generate",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Check subscription tier and enforce AI document generation limit
    const tier = await getUserSubscriptionTier(userId);
    const tierFeatures = getTierFeatures(tier);
    const genLimit = tierFeatures.features.aiDocumentGenerations;

    // Track usage in user metadata
    const currentMonth = new Date();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const metadata = user?.metadata && typeof user.metadata === "object" ? (user.metadata as any) : {};
    const lastResetMonth = metadata?.aiGenLastResetMonth;
    const generationCount = metadata?.aiGenCount || 0;

    // Reset counter if we've entered a new month
    let currentGenCount = generationCount;
    if (!lastResetMonth || lastResetMonth !== currentMonth.toISOString().slice(0, 7)) {
      currentGenCount = 0;
    }

    if (currentGenCount >= genLimit) {
      throw new AppError(
        403,
        `You have reached the AI document generation limit (${genLimit}/month) for your ${tier} plan. Upgrade to generate more documents.`
      );
    }

    const { template, data, language } = z
      .object({ template: z.string().min(1), data: z.record(z.any()).optional(), language: z.string().optional() })
      .parse(req.body);

    const doc = await generateDocument(template, data || {}, language || 'en');

    // Increment generation count
    await db
      .update(users)
      .set({
        metadata: JSON.parse(
          JSON.stringify({
            ...metadata,
            aiGenCount: currentGenCount + 1,
            aiGenLastResetMonth: currentMonth.toISOString().slice(0, 7),
          })
        ),
      } as any)
      .where(eq(users.id, userId));

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







