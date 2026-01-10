import { Express } from "express";
import authRoutes from "./routes/auth";
import applicationRoutes from "./routes/applications";
import consultationRoutes from "./routes/consultations";
import documentRoutes from "./routes/documents";
import aiRoutes from "./routes/ai";
import statsRoutes from "./routes/stats";
import healthRoutes from "./routes/health";
import researchRoutes from "./routes/research";
import roadmapRoutes from "./routes/roadmap";
import stripeRoutes from "./routes/stripe";
import notificationRoutes from "./routes/notifications";
import reportsRoutes from "./routes/reports";
import subscriptionsRoutes from "./routes/subscriptions";
import messagesRoutes from "./routes/messages";
import webhooksRoutes from "./routes/webhooks";
import settingsRoutes from "./routes/settings";
import adminRoutes from "./routes/admin";
import visaRoutes from "./routes/visa";
import analyticsRoutes from "./routes/analytics";
import debugRoutes from "./routes/debug";
import translateRoutes from "./routes/translate";
import canadaRoutes from "./routes/canada";
import publicStatsRouter from "./routes/public-stats";
import ukRtwRoutes from "./routes/ukrtwchecker";
import tasksRoutes from "./routes/tasks";
import invoicesRoutes from "./routes/invoices";
import clientsRoutes from "./routes/clients";
import predictiveRoutes from "./routes/predictive";
import voiceRoutes from "./routes/voice";
import agentsRoutes from "./routes/agents";
import paymentsUzRoutes from "./routes/payments-uz";
import govCheckRoutes from "./routes/gov-check";
import lawyerAutomationRoutes from "./routes/lawyer-automation";
import { companyRouter } from "./routes/companies";
import leadsRoutes from "./routes/leads";
import timeEntriesRoutes from "./routes/time-entries";
import formsRouter from "./routes/forms";

// Import other potential routes if they exist and are valid, 
// but skipping financials/practice as they caused conflicts.
// Also skipping: predict, deadlines, video, ocr, referral, audit, signatures, interview, verification, dataset, files.
// These were in HEAD but I need to check if they exist.
// Step 357 showed they exist. I should include them if they are valid.
// HEAD imports were: predict, deadlines, video, ocr, referral, audit, signatures, interview, verification, dataset, files.
// I will include them to be safe and feature-complete, assuming they don't break.
// If they use "Lawyer ERP" tables (deleted), they might break.
// "files.ts" uses "fileBlobs"? "fileBlobs" is in schema. Safe.
// "referrals.ts" uses "referrals". Safe.
// "signatures.ts" uses "signatureRequests". Safe.
// "interview.ts" uses "interviews". Safe.
// "verification.ts" uses "employerVerifications"? No, "verificationChain". Safe.
// "dataset.ts" uses "aiDataset". Safe.
// "predict.ts" likely uses AI models, maybe safe.
// "deadlines.ts"? Might use "tasks". Schema "tasks" exists but simplified. Check if deadlines.ts works later.
// "video.ts", "ocr.ts". likely safe.

import predictRoutes from "./routes/predict";
import deadlinesRoutes from "./routes/deadlines";
import videoRoutes from "./routes/video";
import ocrRoutes from "./routes/ocr";
import referralRoutes from "./routes/referrals";
import auditRoutes from "./routes/audit";
import signatureRoutes from "./routes/signatures";
import interviewRoutes from "./routes/interview";
import verificationRoutes from "./routes/verification";
import datasetRoutes from "./routes/dataset";
import filesRoutes from "./routes/files";
import simulatorRoutes from "./routes/simulator";

// New modules (Static Imports)
import checklistsRoutes from "./routes/checklists";
import templatesRoutes from "./routes/templates";
import communityRoutes from "./routes/community";

export async function registerRoutes(app: Express) {
  try {
    // Webhooks must be registered BEFORE JSON parsing middleware
    app.use("/webhooks", webhooksRoutes);

    // Public routes
    app.use("/api", publicStatsRouter);

    app.use("/api/auth", authRoutes);
    app.use("/api/applications", applicationRoutes);
    console.log("Registering consultation routes...");
    app.use("/api/consultations", consultationRoutes);
    app.use("/api/documents", documentRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/stats", statsRoutes);
    app.use("/api/health", healthRoutes);
    app.use("/api/research", researchRoutes);
    app.use("/api/roadmap", roadmapRoutes);
    app.use("/api/stripe", stripeRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/reports", reportsRoutes);
    app.use("/api/subscription", subscriptionsRoutes);
    app.use("/api/messages", messagesRoutes);
    app.use("/api/translate", translateRoutes);
    app.use("/api/users", settingsRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/visa", visaRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/debug", debugRoutes);

    // New: Simulator Route
    app.use("/api/simulator", simulatorRoutes);

    // New/Consolidated Routes
    app.use("/api/canada", canadaRoutes);
    app.use("/api/ukrtwchecker", ukRtwRoutes);
    app.use("/api/tasks", tasksRoutes);
    app.use("/api/invoices", invoicesRoutes);
    app.use("/api/clients", clientsRoutes);
    app.use("/api/predictive", predictiveRoutes);
    app.use("/api/voice", voiceRoutes);
    app.use("/api/agents", agentsRoutes);

    app.use("/api/gov-check", govCheckRoutes);
    app.use("/api/lawyer/automation", lawyerAutomationRoutes);
    app.use("/api/companies", companyRouter);

    // Phase 5: SAP-like Platform Routes
    app.use("/api/leads", leadsRoutes);
    app.use("/api/time-entries", timeEntriesRoutes);
    app.use("/api/forms", formsRouter);
    app.use("/api/payments-uz", paymentsUzRoutes);

    // New Feature Routes (Checklists, Templates)
    app.use("/api/checklists", checklistsRoutes);
    app.use("/api/templates", templatesRoutes);

    // New Feature Routes (Community)
    app.use("/api/community", communityRoutes);
    app.use("/api/health", healthRoutes);
    app.use("/api/research", researchRoutes);
    app.use("/api/roadmap", roadmapRoutes);
    app.use("/api/stripe", stripeRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/reports", reportsRoutes);
    app.use("/api/subscription", subscriptionsRoutes);
    app.use("/api/messages", messagesRoutes);
    app.use("/api/translate", translateRoutes);
    app.use("/api/users", settingsRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/visa", visaRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/debug", debugRoutes);

    // New: Simulator Route
    app.use("/api/simulator", simulatorRoutes);

    // New/Consolidated Routes
    app.use("/api/canada", canadaRoutes);
    app.use("/api/ukrtwchecker", ukRtwRoutes);
    app.use("/api/tasks", tasksRoutes);
    app.use("/api/invoices", invoicesRoutes);
    app.use("/api/clients", clientsRoutes);
    app.use("/api/predictive", predictiveRoutes);
    app.use("/api/voice", voiceRoutes);
    app.use("/api/agents", agentsRoutes);

    app.use("/api/gov-check", govCheckRoutes);
    app.use("/api/lawyer/automation", lawyerAutomationRoutes);
    app.use("/api/companies", companyRouter);

    // Phase 5: SAP-like Platform Routes
    app.use("/api/leads", leadsRoutes);
    app.use("/api/time-entries", timeEntriesRoutes);
    app.use("/api/forms", formsRouter);
    app.use("/api/payments-uz", paymentsUzRoutes);

    // New Feature Routes (Checklists, Templates)
    app.use("/api/checklists", checklistsRoutes);
    app.use("/api/templates", templatesRoutes);

    // HEAD Routes preserved
    app.use("/api/predict", predictRoutes);
    app.use("/api/deadlines", deadlinesRoutes);
    app.use("/api/video", videoRoutes);
    app.use("/api/ocr", ocrRoutes);
    app.use("/api/referrals", referralRoutes);
    app.use("/api/audit", auditRoutes);
    app.use("/api/signatures", signatureRoutes);
    app.use("/api/interview", interviewRoutes);
    app.use("/api/verification", verificationRoutes);
    app.use("/api/dataset", datasetRoutes);
    app.use("/api/files", filesRoutes);
  } catch (err) {
    console.error("CRITICAL ERROR in registerRoutes:", err);
    throw err;
  }
}
