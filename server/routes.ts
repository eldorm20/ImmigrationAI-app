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
import translateRoutes from "./routes/translate"; // New import
import publicStatsRouter from "./routes/public-stats";
import ukRtwRoutes from "./routes/ukrtwchecker";
import tasksRoutes from "./routes/tasks";
import invoicesRoutes from "./routes/invoices";
import clientsRoutes from "./routes/clients";
import predictiveRoutes from "./routes/predictive";
import voiceRoutes from "./routes/voice";
import agentsRoutes from "./routes/agents";

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
  app.use("/api/translate", translateRoutes);
  app.use("/api/users", settingsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/visa", visaRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/debug", debugRoutes);
  app.use("/api/ukrtwchecker", ukRtwRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/predictive", predictiveRoutes);
  app.use("/api/voice", voiceRoutes);
  app.use("/api/agents", agentsRoutes);
}
