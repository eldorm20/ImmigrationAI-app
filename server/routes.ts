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

export function registerRoutes(app: Express) {
  // Webhooks must be registered BEFORE JSON parsing middleware
  app.use("/webhooks", webhooksRoutes);
  
  app.use("/api/auth", authRoutes);
  app.use("/api/applications", applicationRoutes);
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
  app.use("/api/users", settingsRoutes);
}