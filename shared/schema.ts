import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  decimal, 
  boolean,
  jsonb,
  pgEnum,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "lawyer", "applicant"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "in_progress",
  "pending_documents",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled"
]);
export const consultationStatusEnum = pgEnum("consultation_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show"
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded"
]);
export const paymentProviderEnum = pgEnum("payment_provider", [
  "stripe",
  "payme",
  "click"
]);

export const researchCategoryEnum = pgEnum("research_category", [
  "visa",
  "cases",
  "regulations",
  "guides",
  "other",
]);

export const researchTypeEnum = pgEnum("research_type", [
  "guide",
  "case_study",
  "regulation",
  "faq",
  "blog",
  "masterclass",
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  role: userRoleEnum("role").notNull().default("applicant"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  metadata: jsonb("metadata"), // Store subscription and other metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
}));

// Applications/Leads table
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  visaType: varchar("visa_type", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  status: applicationStatusEnum("status").notNull().default("new"),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Store additional flexible data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("applications_user_id_idx").on(table.userId),
  statusIdx: index("applications_status_idx").on(table.status),
  createdAtIdx: index("applications_created_at_idx").on(table.createdAt),
}));

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // S3/Railway storage URL
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size"), // in bytes
  documentType: varchar("document_type", { length: 100 }), // passport, certificate, etc.
  s3Key: varchar("s3_key", { length: 500 }), // Internal storage key (S3/Railway)
  ocrData: jsonb("ocr_data"), // OCR extracted data
  aiAnalysis: jsonb("ai_analysis"), // AI analysis results
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  applicationIdIdx: index("documents_application_id_idx").on(table.applicationId),
  userIdIdx: index("documents_user_id_idx").on(table.userId),
}));

// Consultations/Bookings table
export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lawyerId: varchar("lawyer_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "set null" }),
  scheduledTime: timestamp("scheduled_time").notNull(),
  duration: integer("duration").default(60), // minutes
  status: consultationStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  meetingLink: varchar("meeting_link", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  lawyerIdIdx: index("consultations_lawyer_id_idx").on(table.lawyerId),
  userIdIdx: index("consultations_user_id_idx").on(table.userId),
  scheduledTimeIdx: index("consultations_scheduled_time_idx").on(table.scheduledTime),
}));

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  provider: paymentProviderEnum("provider").notNull(),
  providerTransactionId: varchar("provider_transaction_id", { length: 255 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata"), // Store provider-specific data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("payments_user_id_idx").on(table.userId),
  applicationIdIdx: index("payments_application_id_idx").on(table.applicationId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// Messages/Chat table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  attachments: jsonb("attachments"), // Array of document IDs
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
  receiverIdIdx: index("messages_receiver_id_idx").on(table.receiverId),
  applicationIdIdx: index("messages_application_id_idx").on(table.applicationId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
}));

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "user.login", "application.create"
  resourceType: varchar("resource_type", { length: 50 }), // e.g., "application", "document"
  resourceId: varchar("resource_id", { length: 255 }),
  metadata: jsonb("metadata"), // Additional context (IP, user agent, etc.)
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
}));

// Refresh tokens table (for JWT refresh token rotation)
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
  tokenIdx: index("refresh_tokens_token_idx").on(table.token),
}));

// Research articles / knowledge base
export const researchArticles = pgTable("research_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  summary: text("summary"),
  body: text("body"),
  category: researchCategoryEnum("category").notNull().default("visa"),
  type: researchTypeEnum("type").notNull().default("guide"),
  language: varchar("language", { length: 5 }).notNull().default("en"),
  tags: jsonb("tags"),
  source: varchar("source", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 500 }),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").notNull().default(true),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: varchar("updated_by_user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("research_slug_idx").on(table.slug),
  categoryIdx: index("research_category_idx").on(table.category),
  languageIdx: index("research_language_idx").on(table.language),
  publishedIdx: index("research_published_idx").on(table.isPublished, table.publishedAt),
}));

// Roadmap items table for tracking visa application progress
export const roadmapItems = pgTable("roadmap_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id", { length: 255 }).notNull().references(() => applications.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, current, completed
  order: integer("order").notNull().default(0),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"), // Store additional data like progress percentage, notes, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  applicationIdIdx: index("roadmap_application_id_idx").on(table.applicationId),
  statusIdx: index("roadmap_status_idx").on(table.status),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().max(255),
  hashedPassword: z.string().min(1),
  role: z.enum(["admin", "lawyer", "applicant"]),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().nullable(),
}).pick({
  email: true,
  hashedPassword: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
});

// Subscriptions table (normalized storage for provider subscriptions)
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: paymentProviderEnum("provider").notNull().default("stripe"),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }).notNull().unique(),
  planId: varchar("plan_id", { length: 255 }),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  currentPeriodEnd: timestamp("current_period_end"),
  metadata: jsonb("metadata"),
  lastEventId: varchar("last_event_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
  providerSubIdx: index("subscriptions_provider_subscription_id_idx").on(table.providerSubscriptionId),
  statusIdx: index("subscriptions_status_idx").on(table.status),
}));

export const insertApplicationSchema = createInsertSchema(applications, {
  visaType: z.string().min(1).max(100),
  country: z.string().length(2), // ISO country code
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
}).pick({
  userId: true,
  visaType: true,
  country: true,
  fee: true,
  notes: true,
  metadata: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  applicationId: true,
  userId: true,
  url: true,
  s3Key: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  documentType: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).pick({
  lawyerId: true,
  userId: true,
  applicationId: true,
  scheduledTime: true,
  duration: true,
  notes: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  applicationId: true,
  amount: true,
  currency: true,
  provider: true,
  metadata: true,
});

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1).max(10000),
}).pick({
  senderId: true,
  receiverId: true,
  applicationId: true,
  content: true,
  attachments: true,
});

export const insertResearchArticleSchema = createInsertSchema(researchArticles, {
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  summary: z.string().min(10).max(2000),
  body: z.string().min(50).max(20000),
  category: z.enum(["visa", "cases", "regulations", "guides", "other"]),
  type: z.enum(["guide", "case_study", "regulation", "faq", "blog", "masterclass"]),
  language: z.string().min(2).max(5),
  tags: z.array(z.string().min(1)).optional(),
  sourceUrl: z.string().url().optional().nullable(),
}).pick({
  title: true,
  slug: true,
  summary: true,
  body: true,
  category: true,
  type: true,
  language: true,
  tags: true,
  source: true,
  sourceUrl: true,
});

export const insertRoadmapItemSchema = createInsertSchema(roadmapItems, {
  title: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  status: z.enum(["pending", "current", "completed"]).default("pending"),
  dueDate: z.date().optional(),
}).pick({
  applicationId: true,
  title: true,
  description: true,
  status: true,
  order: true,
  dueDate: true,
  metadata: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  userId: z.string().uuid().optional(),
  providerSubscriptionId: z.string().min(1).max(255),
  planId: z.string().max(255).optional(),
  status: z.enum(["incomplete","incomplete_expired","trialing","active","past_due","canceled","unpaid"]).optional(),
  currentPeriodEnd: z.date().optional(),
  metadata: z.any().optional(),
}).pick({
  userId: true,
  providerSubscriptionId: true,
  planId: true,
  status: true,
  currentPeriodEnd: true,
  metadata: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertResearchArticle = z.infer<typeof insertResearchArticleSchema>;
export type ResearchArticle = typeof researchArticles.$inferSelect;
export type InsertRoadmapItem = z.infer<typeof insertRoadmapItemSchema>;
export type RoadmapItem = typeof roadmapItems.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

