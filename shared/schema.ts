import { sql, relations } from "drizzle-orm";
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
  index,
  customType,
  vector
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "lawyer", "applicant", "employer"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "pending",
  "in_progress",
  "pending_documents",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "submitted_to_gov"
]);
export const consultationStatusEnum = pgEnum("consultation_status", [
  "pending",
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "accepted",
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

export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "archived"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "void", "overdue"]);

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
  referralCode: varchar("referral_code", { length: 20 }).unique(),
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
  lawyerId: varchar("lawyer_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  visaType: varchar("visa_type", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  status: applicationStatusEnum("status").notNull().default("new"),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  encryptedPassportNumber: text("encrypted_passport"), // Encrypted PII
  encryptedDateOfBirth: text("encrypted_dob"), // Encrypted PII
  metadata: jsonb("metadata"), // Store additional flexible data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("applications_user_id_idx").on(table.userId),
  lawyerIdIdx: index("applications_lawyer_id_idx").on(table.lawyerId),
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
  status: consultationStatusEnum("status").notNull().default("pending"),
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

// Internal Tasks table for lawyers
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lawyerId: varchar("lawyer_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  lawyerIdIdx: index("tasks_lawyer_id_idx").on(table.lawyerId),
  applicationIdIdx: index("tasks_application_id_idx").on(table.applicationId),
  statusIdx: index("tasks_status_idx").on(table.status),
}));

// Templates table
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  visaType: varchar("visa_type", { length: 100 }),
  content: text("content").notNull(),
  placeholders: jsonb("placeholders").$type<string[]>().notNull().default([]),
  language: varchar("language", { length: 5 }).notNull().default("en"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("templates_user_id_idx").on(table.userId),
  docTypeIdx: index("templates_doc_type_idx").on(table.documentType),
}));

export const insertTemplateSchema = createInsertSchema(templates).pick({
  name: true,
  description: true,
  category: true,
  documentType: true,
  visaType: true,
  content: true,
  language: true,
  isSystem: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

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
  embedding: vector("embedding", { dimensions: 1536 }),
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
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id", { length: 255 }).references(() => companies.id, { onDelete: "cascade" }),
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
  lawyerId: z.string().optional(),
}).pick({
  userId: true,
  visaType: true,
  country: true,
  fee: true,
  lawyerId: true,
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
  status: z.enum(["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid"]).optional(),
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

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "archived"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().datetime().optional().nullable().or(z.null()).transform(val => val ? new Date(val) : null),
}).pick({
  applicationId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
}).extend({
  lawyerId: z.string().optional(),
  applicationId: z.string().optional().nullable(),
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  status: z.enum(["draft", "sent", "paid", "void", "overdue"]),
  dueDate: z.string().datetime().optional().nullable().or(z.null()).transform(val => val ? new Date(val) : null),
  taxRate: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  legalEntityName: z.string().optional(),
  inn: z.string().optional(),
  oked: z.string().optional(),
  mfo: z.string().optional(),
}).pick({
  applicantId: true,
  amount: true,
  currency: true,
  status: true,
  dueDate: true,
  items: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  legalEntityName: true,
  inn: true,
  oked: true,
  mfo: true,
}).extend({
  lawyerId: z.string().optional(),
  applicationId: z.string().optional().nullable(),
});

// Employer verification table
export const employerVerifications = pgTable("employer_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(), // ISO country code
  registryType: varchar("registry_type", { length: 50 }).notNull(), // e.g., "uk_companies_house", "eu_registry"
  registryId: varchar("registry_id", { length: 255 }), // Company registration number
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("pending"), // pending, verified, invalid, error
  companyData: jsonb("company_data"), // Store registry response data
  registeredAddress: text("registered_address"),
  businessType: varchar("business_type", { length: 100 }),
  registrationDate: timestamp("registration_date"),
  status: varchar("status", { length: 50 }), // active, dissolved, removed, etc.
  companyNumber: varchar("company_number", { length: 100 }),
  directorNames: jsonb("director_names"), // Array of director names
  shareholderInfo: jsonb("shareholder_info"), // Store shareholding data if available
  sic_codes: jsonb("sic_codes"), // Standard Industrial Classification codes
  verificationDate: timestamp("verification_date"),
  expiresAt: timestamp("expires_at"), // Cache expiration for re-verification
  metadata: jsonb("metadata"), // Store additional verification notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("employer_verifications_user_id_idx").on(table.userId),
  applicationIdIdx: index("employer_verifications_application_id_idx").on(table.applicationId),
  countryIdx: index("employer_verifications_country_idx").on(table.country),
  statusIdx: index("employer_verifications_status_idx").on(table.verificationStatus),
  registryIdIdx: index("employer_verifications_registry_id_idx").on(table.registryId),
}));

// Employer directory cache
export const employerDirectory = pgTable("employer_directory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  registryType: varchar("registry_type", { length: 50 }).notNull(),
  registryId: varchar("registry_id", { length: 255 }).notNull(),
  companyData: jsonb("company_data").notNull(),
  status: varchar("status", { length: 50 }), // active, dissolved, removed
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationsCount: integer("verifications_count").default(0), // Track how many times verified
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyCountryRegistryIdx: index("employer_directory_company_country_registry_idx").on(table.companyName, table.country, table.registryType),
  registryIdIdx: index("employer_directory_registry_id_idx").on(table.registryId),
  lastVerifiedIdx: index("employer_directory_last_verified_idx").on(table.lastVerifiedAt),
}));

export const insertEmployerVerificationSchema = createInsertSchema(employerVerifications, {
  companyName: z.string().min(2).max(255),
  country: z.string().length(2),
  registryType: z.string().min(1).max(50),
  verificationStatus: z.enum(["pending", "verified", "invalid", "error"]).default("pending"),
  registeredAddress: z.string().optional(),
  businessType: z.string().optional(),
  companyNumber: z.string().optional(),
  directorNames: z.array(z.string()).optional(),
  shareholderInfo: z.any().optional(),
  metadata: z.any().optional(),
}).pick({
  applicationId: true,
  userId: true,
  companyName: true,
  country: true,
  registryType: true,
  registryId: true,
  verificationStatus: true,
  companyData: true,
  registeredAddress: true,
  businessType: true,
  registrationDate: true,
  status: true,
  companyNumber: true,
  directorNames: true,
  shareholderInfo: true,
  metadata: true,
});

// Document Packs table
export const documentPacks = pgTable("document_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "cascade" }),
  packName: varchar("pack_name", { length: 255 }).notNull(),
  documentIds: jsonb("document_ids").notNull(), // Array of document IDs
  status: varchar("status", { length: 50 }).default("ready"), // ready, shared, archived
  downloadUrl: text("download_url"),
  sharedWithLawyerId: varchar("shared_with_lawyer_id", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDocumentPackSchema = createInsertSchema(documentPacks).pick({
  userId: true,
  applicationId: true,
  packName: true,
  documentIds: true,
  status: true,
  sharedWithLawyerId: true,
});

// File Blobs table (for database storage of files)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const fileBlobs = pgTable("file_blobs", {
  key: varchar("key", { length: 500 }).primaryKey(),
  fileData: bytea("file_data").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Community / Research Comments
export const articleComments = pgTable("article_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id", { length: 255 }).notNull().references(() => researchArticles.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  articleIdIdx: index("article_comments_article_id_idx").on(table.articleId),
  userIdIdx: index("article_comments_user_id_idx").on(table.userId),
}));

// Community / Research Reactions (Likes)
export const articleReactions = pgTable("article_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id", { length: 255 }).notNull().references(() => researchArticles.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().default("like"), // like, love, insightful, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  articleIdIdx: index("article_reactions_article_id_idx").on(table.articleId),
  userIdArticleIdIdx: index("article_reactions_user_article_idx").on(table.userId, table.articleId),
}));

export const insertArticleCommentSchema = createInsertSchema(articleComments, {
  content: z.string().min(1).max(1000),
}).pick({
  articleId: true,
  userId: true,
  content: true,
});

export const insertArticleReactionSchema = createInsertSchema(articleReactions).pick({
  articleId: true,
  userId: true,
  type: true,
});

export type InsertArticleComment = z.infer<typeof insertArticleCommentSchema>;
export type ArticleComment = typeof articleComments.$inferSelect;
export type InsertArticleReaction = z.infer<typeof insertArticleReactionSchema>;
export type ArticleReaction = typeof articleReactions.$inferSelect;

// Employer Company Profile
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  size: varchar("size", { length: 50 }),
  description: text("description"),
  website: varchar("website", { length: 255 }),
  logo: text("logo"), // URL
  subdomain: varchar("subdomain", { length: 63 }).unique(),
  brandingConfig: jsonb("branding_config"), // { primaryColor: string, ... }
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Billing
  billingEmail: varchar("billing_email", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
}, (table) => ({
  userIdIdx: index("companies_user_id_idx").on(table.userId),
  subdomainIdx: index("companies_subdomain_idx").on(table.subdomain),
}));

// Job Listings
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id", { length: 255 }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("full-time"), // full-time, part-time, contract
  salaryRange: varchar("salary_range", { length: 100 }),
  visaSponsorship: boolean("visa_sponsorship").default(true),
  requirements: jsonb("requirements"), // Array of strings
  status: varchar("status", { length: 50 }).default("active"), // active, closed, draft
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index("jobs_company_id_idx").on(table.companyId),
  statusIdx: index("jobs_status_idx").on(table.status),
}));

export const insertCompanySchema = createInsertSchema(companies, {
  name: z.string().min(2).max(255),
  website: z.string().url().optional().nullable(),
}).pick({
  userId: true,
  name: true,
  industry: true,
  size: true,
  description: true,
  website: true,
  logo: true,
});

export const insertJobSchema = createInsertSchema(jobs, {
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  location: z.string().min(2),
}).pick({
  companyId: true,
  title: true,
  description: true,
  location: true,
  type: true,
  salaryRange: true,
  visaSponsorship: true,
  requirements: true,
  status: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Job = typeof jobs.$inferSelect;

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, paid
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  referrerIdIdx: index("referrals_referrer_id_idx").on(table.referrerId),
  referredUserIdIdx: index("referrals_referred_user_id_idx").on(table.referredUserId),
}));

export const insertReferralSchema = createInsertSchema(referrals).pick({
  referrerId: true,
  referredUserId: true,
  status: true,
  rewardAmount: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Electronic Signatures
export const signatureRequests = pgTable("signature_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  signerId: varchar("signer_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: varchar("document_id", { length: 255 }).references(() => documents.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, signed, rejected
  signatureUrl: text("signature_url"), // Data URI or URL
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  requesterIdIdx: index("signature_requests_requester_id_idx").on(table.requesterId),
  signerIdIdx: index("signature_requests_signer_id_idx").on(table.signerId),
}));

export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).pick({
  requesterId: true,
  signerId: true,
  documentId: true,
  status: true,
});

export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type SignatureRequest = typeof signatureRequests.$inferSelect;

// Blockchain Verification Ledger
export const verificationChain = pgTable("verification_chain", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 255 }).notNull().references(() => documents.id, { onDelete: "cascade" }),
  fileHash: varchar("file_hash", { length: 64 }).notNull(), // SHA-256
  previousHash: varchar("previous_hash", { length: 64 }).notNull(),
  blockHash: varchar("block_hash", { length: 64 }).notNull(), // Hash of this record
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index("verification_chain_document_id_idx").on(table.documentId),
  blockHashIdx: index("verification_chain_block_hash_idx").on(table.blockHash),
}));

export const insertVerificationChainSchema = createInsertSchema(verificationChain);
export type VerificationBlock = typeof verificationChain.$inferSelect;

// AI Fine-Tuning Dataset
export const aiDataset = pgTable("ai_dataset", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  response: text("response").notNull(),
  rating: integer("rating"), // 1 (Good) or -1 (Bad)
  category: varchar("category", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  ratingIdx: index("ai_dataset_rating_idx").on(table.rating),
}));

export const insertAiDatasetSchema = createInsertSchema(aiDataset);
export type AiDatasetEntry = typeof aiDataset.$inferSelect;

// AI Mock Interview Sessions
export const interviews = pgTable("interviews", {
  id: varchar("id").default(sql`gen_random_uuid()`).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(), // No foreign key constraint for simplicity or verify imports if need FK
  title: text("title").notNull(),
  type: text("type").notNull().default("mock_interview"), // mock_interview, consultation
  status: text("status").notNull().default("in_progress"), // in_progress, completed
  durationSeconds: integer("duration_seconds").default(0),
  transcript: jsonb("transcript"), // Array of { role: 'user'|'ai', content: string }
  feedback: jsonb("feedback"), // Only for mock interviews: { score: number, strengths: [], weaknesses: [] }
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterviewSchema = createInsertSchema(interviews);
export const selectInterviewSchema = createSelectSchema(interviews);
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// Notifications System
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // consultation, document, application, payment
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: jsonb("metadata"), // Store related object ID etc
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  readIdx: index("notifications_read_idx").on(table.read),
}));

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  description: true,
  read: true,
  metadata: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// === CANADA EXPRESS ENTRY TABLES ===

// Canada Visa Types
export const visaTypesCanada = pgTable("visa_types_canada", {
  id: varchar("id").default(sql`gen_random_uuid()`).primaryKey(),
  visaCode: varchar("visa_code", { length: 50 }).notNull().unique(),
  visaName: varchar("visa_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  processingDays: integer("processing_days"),
  processingCost: decimal("processing_cost", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Express Entry Requirements (NOC Codes)
export const expressEntryRequirements = pgTable("express_entry_requirements", {
  id: varchar("id").default(sql`gen_random_uuid()`).primaryKey(),
  nocCode: varchar("noc_code", { length: 10 }).notNull().unique(),
  nocTitle: varchar("noc_title", { length: 255 }).notNull(),
  minClbScore: integer("min_clb_score"),
  minEducationLevel: varchar("min_education_level", { length: 50 }),
  preferredExperienceYears: integer("preferred_experience_years"),
  maxAge: integer("max_age"),
  minSalaryCad: decimal("min_salary_cad", { precision: 10, scale: 2 }),
  inDemand: boolean("in_demand").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nocCodeIdx: index("noc_code_idx").on(table.nocCode),
  inDemandIdx: index("noc_in_demand_idx").on(table.inDemand),
}));

// Canada Provincial Nominee Programs
export const canadaPnpProvinces = pgTable("canada_pnp_provinces", {
  id: varchar("id").default(sql`gen_random_uuid()`).primaryKey(),
  provinceCode: varchar("province_code", { length: 10 }).notNull().unique(),
  provinceName: varchar("province_name", { length: 100 }).notNull(),
  priorityOccupations: text("priority_occupations").array(),
  minPoints: integer("min_points"),
  processingDays: integer("processing_days"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports for Canada tables
export type VisaTypeCanada = typeof visaTypesCanada.$inferSelect;
export type ExpressEntryRequirement = typeof expressEntryRequirements.$inferSelect;
export type CanadaPnpProvince = typeof canadaPnpProvinces.$inferSelect;

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
export type InsertEmployerVerification = z.infer<typeof insertEmployerVerificationSchema>;
export type EmployerVerification = typeof employerVerifications.$inferSelect;
export type EmployerDirectory = typeof employerDirectory.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertDocumentPack = z.infer<typeof insertDocumentPackSchema>;
export type DocumentPack = typeof documentPacks.$inferSelect;

// ============================================
// Phase 5: SAP-Like Lawyer Platform Tables
// ============================================

// Lead Pipeline Stages
export const leadStageEnum = pgEnum("lead_stage", [
  "inquiry",
  "contacted",
  "consultation_scheduled",
  "consultation_completed",
  "proposal_sent",
  "converted",
  "lost"
]);

// Leads / CRM table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lawyerId: varchar("lawyer_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  country: varchar("country", { length: 2 }), // ISO country code
  visaInterest: varchar("visa_interest", { length: 100 }), // e.g., "UK Skilled Worker"
  stage: leadStageEnum("stage").notNull().default("inquiry"),
  source: varchar("source", { length: 100 }), // referral, website, ad, etc.
  referredBy: varchar("referred_by", { length: 255 }), // referral source name
  notes: text("notes"),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  nextFollowUp: timestamp("next_follow_up"),
  convertedToApplicationId: varchar("converted_to_application_id", { length: 255 }).references(() => applications.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  lawyerIdIdx: index("leads_lawyer_id_idx").on(table.lawyerId),
  stageIdx: index("leads_stage_idx").on(table.stage),
  emailIdx: index("leads_email_idx").on(table.email),
  nextFollowUpIdx: index("leads_next_follow_up_idx").on(table.nextFollowUp),
}));

// Deadline Types
export const deadlineTypeEnum = pgEnum("deadline_type", [
  "visa_expiry",
  "filing_deadline",
  "rfe_response",
  "document_submission",
  "appointment",
  "payment_due",
  "custom"
]);

// Deadlines table for tracking critical dates
export const deadlines = pgTable("deadlines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  lawyerId: varchar("lawyer_id", { length: 255 }).references(() => users.id),
  type: deadlineTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  reminderDays: integer("reminder_days").default(7), // Days before to send reminder
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  applicationIdIdx: index("deadlines_application_id_idx").on(table.applicationId),
  userIdIdx: index("deadlines_user_id_idx").on(table.userId),
  dueDateIdx: index("deadlines_due_date_idx").on(table.dueDate),
  typeIdx: index("deadlines_type_idx").on(table.type),
  isCompletedIdx: index("deadlines_is_completed_idx").on(table.isCompleted),
}));

// Document Checklist Templates (per visa type)
export const documentChecklists = pgTable("document_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visaType: varchar("visa_type", { length: 100 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(), // ISO country code
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  items: jsonb("items").notNull(), // Array of {name, required, category, description}
  isTemplate: boolean("is_template").notNull().default(true),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  visaTypeCountryIdx: index("document_checklists_visa_type_country_idx").on(table.visaType, table.country),
  isTemplateIdx: index("document_checklists_is_template_idx").on(table.isTemplate),
}));

// Checklist Items (per application, tracking completion)
export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id", { length: 255 }).notNull().references(() => applications.id, { onDelete: "cascade" }),
  checklistId: varchar("checklist_id", { length: 255 }).references(() => documentChecklists.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  isRequired: boolean("is_required").notNull().default(true),
  isCompleted: boolean("is_completed").notNull().default(false),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, correction_required
  documentId: varchar("document_id", { length: 255 }).references(() => documents.id), // Link to uploaded doc
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by", { length: 255 }).references(() => users.id),
  notes: text("notes"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  applicationIdIdx: index("checklist_items_application_id_idx").on(table.applicationId),
  isCompletedIdx: index("checklist_items_is_completed_idx").on(table.isCompleted),
}));

// Time Entries for billable hours tracking
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "set null" }),
  clientId: varchar("client_id", { length: 255 }).references(() => users.id), // applicant user
  invoiceId: varchar("invoice_id", { length: 255 }).references(() => invoices.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  minutes: integer("minutes").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  isBillable: boolean("is_billable").notNull().default(true),
  isBilled: boolean("is_billed").notNull().default(false),
  date: timestamp("date").notNull().defaultNow(),
  category: varchar("category", { length: 100 }), // research, drafting, communication, etc.
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("time_entries_user_id_idx").on(table.userId),
  applicationIdIdx: index("time_entries_application_id_idx").on(table.applicationId),
  clientIdIdx: index("time_entries_client_id_idx").on(table.clientId),
  invoiceIdIdx: index("time_entries_invoice_id_idx").on(table.invoiceId),
  dateIdx: index("time_entries_date_idx").on(table.date),
  isBilledIdx: index("time_entries_is_billed_idx").on(table.isBilled),
}));

// Reminder Types
export const reminderTypeEnum = pgEnum("reminder_type", [
  "deadline",
  "appointment",
  "follow_up",
  "document_request",
  "payment",
  "custom"
]);

// Reminders table for automated notifications
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id", { length: 255 }).references(() => applications.id, { onDelete: "cascade" }),
  deadlineId: varchar("deadline_id", { length: 255 }).references(() => deadlines.id, { onDelete: "cascade" }),
  type: reminderTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  isSent: boolean("is_sent").notNull().default(false),
  channel: varchar("channel", { length: 50 }).default("email"), // email, sms, push
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("reminders_user_id_idx").on(table.userId),
  scheduledForIdx: index("reminders_scheduled_for_idx").on(table.scheduledFor),
  isSentIdx: index("reminders_is_sent_idx").on(table.isSent),
  typeIdx: index("reminders_type_idx").on(table.type),
}));

// Insert schemas for new tables
export const insertLeadSchema = createInsertSchema(leads, {
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  visaInterest: z.string().max(100).optional(),
  stage: z.enum(["inquiry", "contacted", "consultation_scheduled", "consultation_completed", "proposal_sent", "converted", "lost"]).optional(),
  source: z.string().max(100).optional(),
}).pick({
  lawyerId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  country: true,
  visaInterest: true,
  stage: true,
  source: true,
  referredBy: true,
  notes: true,
  estimatedValue: true,
  nextFollowUp: true,
  metadata: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines, {
  title: z.string().min(1).max(255),
  type: z.enum(["visa_expiry", "filing_deadline", "rfe_response", "document_submission", "appointment", "payment_due", "custom"]),
  priority: z.enum(["low", "medium", "high"]).optional(),
}).pick({
  applicationId: true,
  userId: true,
  lawyerId: true,
  type: true,
  title: true,
  description: true,
  dueDate: true,
  reminderDays: true,
  priority: true,
  metadata: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries, {
  description: z.string().min(1),
  minutes: z.number().int().positive(),
}).pick({
  userId: true,
  applicationId: true,
  clientId: true,
  description: true,
  minutes: true,
  hourlyRate: true,
  isBillable: true,
  date: true,
  category: true,
  metadata: true,
});

export const insertReminderSchema = createInsertSchema(reminders, {
  title: z.string().min(1).max(255),
  type: z.enum(["deadline", "appointment", "follow_up", "document_request", "payment", "custom"]),
}).pick({
  userId: true,
  applicationId: true,
  deadlineId: true,
  type: true,
  title: true,
  message: true,
  scheduledFor: true,
  channel: true,
  metadata: true,
});

// Type exports for new tables
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlines.$inferSelect;
export type DocumentChecklist = typeof documentChecklists.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications, { relationName: "applicant" }),
  managedApplications: many(applications, { relationName: "lawyer" }),
  documents: many(documents),
  sentMessages: many(messages),
  receivedMessages: many(messages),
  consultations: many(consultations),
  payments: many(payments),
  tasks: many(tasks), // Tasks assigned to lawyer
  invoices: many(invoices),
  employerVerifications: many(employerVerifications),
  documentPacks: many(documentPacks),
  templates: many(templates),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
    relationName: "applicant",
  }),
  lawyer: one(users, {
    fields: [applications.lawyerId],
    references: [users.id],
    relationName: "lawyer",
  }),

  documents: many(documents),
  messages: many(messages),
  consultations: many(consultations),
  payments: many(payments),
  tasks: many(tasks),
  invoices: many(invoices),
  roadmapItems: many(roadmapItems),
  employerVerifications: many(employerVerifications),
  documentPacks: many(documentPacks),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const researchArticlesRelations = relations(researchArticles, ({ one }) => ({
  creator: one(users, {
    fields: [researchArticles.createdByUserId],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [researchArticles.updatedByUserId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  lawyer: one(users, {
    fields: [tasks.lawyerId],
    references: [users.id],
    relationName: "lawyerTasks" // Matches usersRelations
  }),
  application: one(applications, {
    fields: [tasks.applicationId],
    references: [applications.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  user: one(users, {
    fields: [consultations.userId],
    references: [users.id],
  }),
  lawyer: one(users, {
    fields: [consultations.lawyerId],
    references: [users.id],
  }),
}));
// Background Jobs for long-running tasks (e.g. AI generation)
export const backgroundJobs = pgTable("background_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // document_generation, document_review
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, processing, completed, failed
  payload: jsonb("payload"), // Input data
  result: jsonb("result"), // Output data
  error: text("error"),
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("background_jobs_user_id_idx").on(table.userId),
  statusIdx: index("background_jobs_status_idx").on(table.status),
  typeIdx: index("background_jobs_type_idx").on(table.type),
}));

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).pick({
  userId: true,
  type: true,
  payload: true,
  status: true,
});

export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
