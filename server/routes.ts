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
import employersRoutes from "./routes/employers";
import debugRoutes from "./routes/debug";
import translateRoutes from "./routes/translate"; // New import
import canadaRoutes from "./routes/canada"; // NEW: Canada Express Entry routes
import publicStatsRouter from "./routes/public-stats";
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

export async function registerRoutes(app: Express) {
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
  app.use("/api", settingsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/visa", visaRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/employers", employersRoutes);
  app.use("/api/dataset", datasetRoutes);
  app.use("/api/debug", debugRoutes);
  app.use("/api/canada", canadaRoutes); // Canada CRS calculator
  app.use("/api/translate", translateRoutes);
}