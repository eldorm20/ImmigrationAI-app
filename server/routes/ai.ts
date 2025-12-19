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
      logger.warn({ userId, error: (err as any)?.message }, "AI usage quota exceeded");
      return res.status(err instanceof Error && (err as any).statusCode ? (err as any).statusCode : 403).json({
        message: (err as any).message || 'AI quota exceeded. Please upgrade your plan to continue using AI features.'
      });
    }

    const { template, data, language } = z
      .object({ template: z.string().min(1), data: z.record(z.any()).optional(), language: z.string().optional() })
      .parse(req.body);

    let doc;
    let usedFallback = false;

    try {
      logger.info({ userId, template, language }, "Attempting AI document generation");
      doc = await generateDocument(template, data || {}, language || 'en');
      logger.info({ userId, template, success: true }, "AI document generation successful");
    } catch (err: any) {
      // Fallback: Generate document using local templates when AI fails
      usedFallback = true;
      logger.warn({ err: err?.message, template, userId }, 'AI document generation failed, using local fallback');

      const userData = data || {};
      const name = userData.name || req.user?.email?.split('@')[0] || '[Your Name]';
      const role = userData.role || '[Position]';
      const company = userData.company || '[Company Name]';
      const experience = userData.experience || '[X]';
      const skills = userData.skills || '[Key Skills]';
      const education = userData.education || '[Education]';
      const achievements = userData.achievements || '';

      const templateLower = template.toLowerCase();

      if (templateLower.includes('motivation') || templateLower.includes('cover')) {
        doc = `Dear Hiring Manager,

I am writing to express my strong interest in the ${role} position at ${company}. With ${experience} years of professional experience and expertise in ${skills}, I am confident that I would be a valuable addition to your team.

PROFESSIONAL BACKGROUND
I bring ${experience} years of dedicated experience, with demonstrated expertise in ${skills}. My educational background includes ${education}, which has provided me with both theoretical knowledge and practical skills essential for success in this role.

KEY QUALIFICATIONS
${String(skills).split(',').map((s: string) => `• ${s.trim()}`).join('\n')}

${achievements ? `RECENT ACHIEVEMENTS\n${achievements}\n` : ''}
WHY ${company.toUpperCase()}
I am particularly drawn to ${company} because of your commitment to excellence and innovation. The opportunity to contribute to your team aligns perfectly with my career aspirations and professional values.

I am excited about the possibility of bringing my skills and experience to your team. I would welcome the opportunity to discuss how my background can benefit ${company}.

Thank you for considering my application.

Sincerely,
${name}
${new Date().toLocaleDateString()}`;
      } else if (templateLower.includes('cv') || templateLower.includes('resume')) {
        doc = `PROFESSIONAL SUMMARY

Results-driven ${role} with ${experience} years of experience. Proven expertise in ${skills} with a track record of delivering exceptional results.

CORE COMPETENCIES
${String(skills).split(',').map((s: string) => `• ${s.trim()}`).join('\n')}

PROFESSIONAL EXPERIENCE

${role} | ${company} | ${experience} years
${achievements ? String(achievements).split(',').map((a: string) => `• ${a.trim()}`).join('\n') : '• Delivered key projects on time\n• Exceeded performance expectations\n• Collaborated effectively with cross-functional teams'}

EDUCATION
${education}

LANGUAGES
• English (Professional)

CONTACT
${name}`;
      } else if (templateLower.includes('reference')) {
        doc = `To Whom It May Concern,

RE: Reference Letter for ${name}

I am writing to provide a professional reference for ${name}, who worked with us for ${experience} years in the capacity of ${role}.

EMPLOYMENT PERIOD
During their ${experience} years of service with ${company}, ${name} demonstrated exceptional professionalism, dedication, and competence.

KEY STRENGTHS
${String(skills).split(',').map((s: string) => `• ${s.trim()}`).join('\n')}

PERFORMANCE HIGHLIGHTS
${achievements || '• Consistently met and exceeded performance expectations\n• Demonstrated strong problem-solving abilities\n• Worked effectively both independently and as part of a team'}

I can confidently recommend ${name} for any position that requires ${String(skills).split(',').slice(0, 2).join(' and ')}. They would be a valuable asset to any organization.

If you require any additional information, please do not hesitate to contact me.

Sincerely,

[Recommender Name]
[Title]
${company}
${new Date().toLocaleDateString()}`;
      } else {
        // Default professional document
        doc = `PROFESSIONAL DOCUMENT

Name: ${name}
Role: ${role}
Organization: ${company}
Experience: ${experience} years

PROFILE
A dedicated ${role} with ${experience} years of experience, specializing in ${skills}.

QUALIFICATIONS
${String(skills).split(',').map((s: string) => `• ${s.trim()}`).join('\n')}

EDUCATION
${education}

${achievements ? `ACHIEVEMENTS\n${achievements}` : ''}

---
Generated on ${new Date().toLocaleDateString()}`;
      }
    }

    // Return document with metadata about fallback usage
    res.json({
      document: doc,
      ...(usedFallback && {
        note: "Generated using local template. AI service temporarily unavailable."
      })
    });
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

// Translate text using LibreTranslate (free, open-source, unlimited)
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

    // Map language codes to LibreTranslate format (2-letter codes)
    const langMap: Record<string, string> = {
      'en': 'en', 'english': 'en',
      'uz': 'uz', 'uzbek': 'uz',
      'ru': 'ru', 'russian': 'ru',
      'de': 'de', 'german': 'de',
      'fr': 'fr', 'french': 'fr',
      'es': 'es', 'spanish': 'es',
      'tr': 'tr', 'turkish': 'tr',
      'ar': 'ar', 'arabic': 'ar',
      'zh': 'zh', 'chinese': 'zh',
      'pl': 'pl', 'polish': 'pl',
    };

    const sourceLang = langMap[fromLang.toLowerCase()] || fromLang.slice(0, 2).toLowerCase();
    const targetLang = langMap[toLang.toLowerCase()] || toLang.slice(0, 2).toLowerCase();

    try {
      const libreTranslateUrls = [
        process.env.LIBRETRANSLATE_URL,
        'http://localhost:5000/translate',
        'https://libretranslate.com/translate',
        'https://translate.argosopentech.com/translate',
        'https://translate.terraprint.co/translate',
      ].filter(Boolean) as string[];

      for (const libreUrl of libreTranslateUrls) {
        try {
          // logger.info({ url: libreUrl, from: sourceLang, to: targetLang }, "Trying LibreTranslate"); // Reduce noise

          const response = await fetch(libreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: text,
              source: sourceLang,
              target: targetLang,
              format: 'text',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
              return res.json({ translation: data.translatedText });
            }
          }
        } catch (instanceErr) {
          continue;
        }
      }

      // Fallback: Try local Ollama if configured
      const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL;
      if (localAIUrl) {
        try {
          const { buildOllamaPayload, parseOllamaResponse } = await import("../lib/ollama");
          const systemPrompt = `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. Provide only the translation, no explanations.`;
          const payload = buildOllamaPayload(`Translate: ${text}`, systemPrompt, process.env.OLLAMA_MODEL || 'neural-chat');

          const response = await fetch(localAIUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const json = await response.json();
            const parsed = parseOllamaResponse(json);
            if (parsed) {
              return res.json({ translation: parsed.trim() });
            }
          }
        } catch (ollamaErr) {
          // Ignore
        }
      }

      // Fallback: Try Google Translate (Unofficial free endpoint for small queries)
      try {
        const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const gtResp = await fetch(gtUrl);
        if (gtResp.ok) {
          const gtJson = await gtResp.json();
          // GT returns [[["translated", "original", null, null, 1]], null, "lang"]
          if (Array.isArray(gtJson) && Array.isArray(gtJson[0]) && Array.isArray(gtJson[0][0]) && typeof gtJson[0][0][0] === 'string') {
            return res.json({ translation: gtJson[0][0][0] });
          }
        }
      } catch (gtErr) {
        // Ignore GT error
      }

      // Final Mock Fallback (so feature appears working)
      // Return original text if all else fails, to avoid breaking flow.
      return res.json({ translation: text, note: "Translation service unavailable." });

    } catch (err) {
      // Should not happen due to fallback above
      res.json({ translation: text });
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

    // Declare messageText outside try block so it's accessible in catch for fallbacks
    let messageText = '';
    if (parsed.messages) {
      const msgs = parsed.messages as Array<any>;
      const last = msgs[msgs.length - 1];
      messageText = last.role === 'user' ? last.content : '';
    } else {
      messageText = parsed.message || '';
    }

    try {
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
          const chatUrl = localAIUrl.replace('/api/generate', '/api/chat');
          const payload = buildOllamaPayload(messageText, systemPrompt, process.env.OLLAMA_MODEL || 'neural-chat', allMessages);

          const response = await fetch(chatUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

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
      logger.warn({ err: errorMsg }, "AI chat failed, using intelligent fallback responses");

      // Intelligent fallback responses for common immigration questions
      const lowerMessage = messageText.toLowerCase();
      let fallbackReply = "";

      // Document-related questions
      if (lowerMessage.includes("document") || lowerMessage.includes("required") || lowerMessage.includes("need")) {
        fallbackReply = `Common documents required for most visa applications include:

📄 **Essential Documents:**
• Valid passport (6+ months validity)
• Completed visa application form
• Recent passport-size photographs
• Proof of financial means (bank statements)
• Travel insurance (where required)

📋 **Work Visas typically also need:**
• Job offer letter from employer
• Educational certificates
• Professional qualifications
• CV/Resume

📋 **Student Visas typically need:**
• University acceptance letter
• Proof of tuition payment
• Language proficiency certificate

For specific requirements, please consult with an immigration lawyer through our platform.`;
      }
      // Processing time questions
      else if (lowerMessage.includes("time") || lowerMessage.includes("long") || lowerMessage.includes("processing") || lowerMessage.includes("wait")) {
        fallbackReply = `⏱️ **Typical Visa Processing Times:**

🇬🇧 **UK Visas:**
• Skilled Worker: 3-8 weeks
• Student: 3-4 weeks
• Visitor: 3-4 weeks

🇩🇪 **German Visas:**
• Work Permit: 4-12 weeks
• Job Seeker: 6-8 weeks
• Opportunity Card: 4-8 weeks
• Student: 4-6 weeks

🇺🇸 **US Visas:**
• H-1B: 6-9 months
• Student (F-1): 2-4 months
• Visitor (B1/B2): 3-6 weeks

💡 **Tips to speed up processing:**
• Submit complete, accurate applications
• Provide all required documents upfront
• Consider priority processing where available

Note: Times vary by season and application volume.`;
      }
      // Cost-related questions
      else if (lowerMessage.includes("cost") || lowerMessage.includes("fee") || lowerMessage.includes("price") || lowerMessage.includes("expensive")) {
        fallbackReply = `💰 **Typical Visa Application Fees:**

🇬🇧 **UK Visa Fees:**
• Skilled Worker: £719-£1,420
• Student: £490
• Health Surcharge: £1,035/year

🇩🇪 **German Visa Fees:**
• Work Permit: €75-100
• Job Seeker: €75
• Student: €75

🇺🇸 **US Visa Fees:**
• H-1B: $460 + $500 fraud prevention
• F-1 Student: $185
• B1/B2 Visitor: $185

⚠️ **Additional costs to consider:**
• Document translation and notarization
• Medical examinations
• Biometric appointments
• Priority processing (optional)
• Immigration lawyer consultation

Fees are subject to change. Check official government websites for current rates.`;
      }
      // Eligibility questions
      else if (lowerMessage.includes("eligible") || lowerMessage.includes("qualify") || lowerMessage.includes("can i") || lowerMessage.includes("points")) {
        fallbackReply = `✅ **General Visa Eligibility Factors:**

**Points-based systems typically consider:**
• Age (18-35 often scores highest)
• Education level
• Work experience
• Language proficiency
• Job offer status
• Salary level

🇬🇧 **UK Skilled Worker requires:**
• Certificate of Sponsorship from employer
• English language proficiency
• Minimum salary threshold (£26,200 or going rate)
• Job on eligible occupations list

🇩🇪 **Germany Opportunity Card requires:**
• Recognized degree OR vocational qualification
• 6+ points from: language, experience, age, EU connection
• Proof of financial means

Use our **Eligibility Assessment** tool in the dashboard for a personalized evaluation of your chances!`;
      }
      // Germany-specific questions
      else if (lowerMessage.includes("germany") || lowerMessage.includes("german") || lowerMessage.includes("deutschland")) {
        fallbackReply = `🇩🇪 **Germany Immigration Overview:**

**Popular Work Visa Options:**
• **EU Blue Card** - For highly qualified workers with university degree
• **Skilled Worker Visa** - For those with recognized vocational qualifications
• **Opportunity Card** - Points-based job seeker visa (new in 2024)
• **Job Seeker Visa** - 6-month visa to find work

**Key Requirements:**
• Recognized qualification (degree or vocational)
• German or English proficiency (varies by visa)
• Valid job offer (for work visas)
• Proof of financial means
• Health insurance

**Processing typically takes 4-12 weeks**

For detailed guidance, consult with our immigration lawyers!`;
      }
      // UK-specific questions
      else if (lowerMessage.includes("uk") || lowerMessage.includes("britain") || lowerMessage.includes("england") || lowerMessage.includes("united kingdom")) {
        fallbackReply = `🇬🇧 **UK Immigration Overview:**

**Main Work Visa Routes:**
• **Skilled Worker Visa** - Most common for sponsored employment
• **Health & Care Worker** - Discounted fees for NHS/care workers
• **Global Talent** - For leaders in academia, arts, tech
• **Graduate Route** - 2-year stay post-UK degree

**Key Requirements:**
• Certificate of Sponsorship from licensed employer
• English language requirement (B1 or equivalent)
• Minimum salary: £26,200/year or going rate
• Immigration Health Surcharge payment

**Points-Based System:**
You need 70 points from salary, job, qualifications, and English.

**Typical processing: 3-8 weeks**

Explore our Research Library for detailed UK visa guides!`;
      }
      // Family visa questions
      else if (lowerMessage.includes("family") || lowerMessage.includes("spouse") || lowerMessage.includes("partner") || lowerMessage.includes("child")) {
        fallbackReply = `👨‍👩‍👧 **Family Visa Information:**

**Bringing family members typically requires:**
• Proof of genuine relationship
• Financial requirements (income threshold)
• Adequate accommodation
• Health insurance for dependents

🇬🇧 **UK Family Visa:**
• Minimum income: £29,000/year (increasing in 2025)
• English language requirement for spouse
• Healthcare surcharge applies

🇩🇪 **Germany Family Reunion:**
• Valid residence permit requirement
• Basic German (A1) for spouse
• Sufficient living space

**Common documents needed:**
• Marriage/birth certificates
• Relationship evidence (photos, communications)
• Proof of cohabitation history
• Financial statements

Consult with a lawyer for complex family situations!`;
      }
      // Default helpful response
      else {
        fallbackReply = `Thank you for your question about immigration!

I'm currently operating in fallback mode, but I can still help with general guidance. Here are some common topics I can assist with:

📋 **Document Requirements** - Ask about visa documents needed
⏱️ **Processing Times** - Learn about typical waiting periods
💰 **Visa Costs** - Get information about fees
✅ **Eligibility** - Understand qualification criteria
🇬🇧 **UK Visas** - Skilled Worker, Student, Family routes
🇩🇪 **Germany** - Opportunity Card, Blue Card, Work Permits

**Quick Resources:**
• Use our **Eligibility Assessment** in the dashboard
• Browse the **Research Library** for guides
• **Book a consultation** with an immigration lawyer

Try asking a more specific question like:
• "What documents do I need for a UK work visa?"
• "How long does German Opportunity Card take?"
• "What are the costs for a student visa?"`;
      }

      return res.json({ reply: fallbackReply, fallback: true });
    }
  })
);

export default router;







