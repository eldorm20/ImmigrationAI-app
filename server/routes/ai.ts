import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getEligibilityQuestions,
  checkEligibility,
  analyzeDocument,
  generateInterviewQuestions,
  evaluateInterviewAnswer,
} from "../lib/ai";
import { db } from "../db";
import { documents } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

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
    const userId = req.user!.id;
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

export default router;







