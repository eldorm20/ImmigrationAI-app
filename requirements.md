# ImmigrationAI – Product and Technical Requirements

Version: 1.0

This document defines the end-state product and engineering requirements used as the source of truth for implementation and verification. Any existing code conflicting with this document must be refactored to comply.


1. Vision and Users
- Vision: Help users from Uzbekistan and CIS successfully move to UK/EU using AI documents, interview prep, document checking, and guided legal workflows.
- Users and roles:
  - Client: end-user seeking visas. Can manage roadmap, checklist, AI docs, interview prep, uploads, chat, research, and messages.
  - Lawyer: immigration professional managing consultations, clients, cases, templates, analytics, financials, and company checks.


2. Non‑functional requirements
- Availability: 99.5% monthly (Railway multi-services). Graceful degradation if AI/RAG unavailable.
- Performance:
  - P95 page TTFB < 500ms for cached endpoints; < 1.5s for dynamic.
  - AI responses first token < 3–5s (streamed). Long jobs offloaded to background queue (Redis) with progress.
- Security: OWASP ASVS L1. Strict authZ by role and resource. Helmet + CORS. No raw stack traces to users. Input validation on server (Zod).
- Observability: structured logs with correlation IDs, request logging, error tracing, minimal metrics hooks suitable for Railway log drains.
- Internationalization: English, Uzbek, Russian for all UI text and user-facing error messages.
- UX: Apple-inspired visual system (dark glass, neon gradients, high-contrast typography), smooth transitions, responsive.
- Code quality: TypeScript end-to-end, ESLint + Prettier, unit/integration tests for critical flows.


3. Tech Architecture
- Hosting: Railway with services:
  1) Web app (Express + Vite React)
  2) Ollama/AI model service (or HF fallback)
  3) RAG service (vector search over immigration content)
  4) Redis (cache + queues)
  5) PostgreSQL (primary DB)
- Frontend: Vite + React + TS, router based. Design system components for Apple-style UI and i18n.
- Backend: Express + TS in server/, centralized error handling, request validation, Socket.IO for messaging, Stripe optional.
- Background processing: Redis-backed worker for long AI jobs & reminders.
- Storage: S3-compatible for uploads (S3 or MinIO).


4. Authentication and Authorization
- Sign in/out, password reset, sessions via secure cookies (HttpOnly, SameSite=Lax/None if cross-site), CSRF protections for sensitive mutations if needed.
- Role-based routing and access control. Client cannot access Lawyer routes and vice versa. Redirect to role-appropriate dashboards on login; clean logout redirect.
- Session validation middleware attaches user + role to request, adds correlation ID.


5. Error Handling & Logging
- Centralized error middleware returns friendly messages and codes; no raw stack traces.
- Each request gets x-correlation-id; logs include userId, role, route, status.
- Retry and timeout policies for AI/RAG/Stripe/S3.
- 4xx/5xx mapped to user-specific toasts/modals with actionable text.


6. Internationalization (i18n)
- Shared translation catalog for en, uz, ru.
- All UI strings and validation messages loaded from i18n provider.
- Language toggle persisted per user.


7. Design System and UI/UX
- Foundations: color tokens (dark, glass panels, gradient accents), typography scale, spacing, elevation, radius, motion.
- Components: AppShell, Sidebar, TopBar, Button, Card/GlassPanel, Modal/Sheet, Input/TextArea, Select, Table, Tabs, Toast, Tag/Status, Progress, Timeline, EmptyState, Loader, Badge.
- Patterns: forms with inline validation, optimistic updates where safe, skeletons/spinners, streamed AI responses.


8. Client Features
1) Roadmap
- Dynamic roadmap by case type/stage persisted in DB. Steps auto-update when tasks complete. Partial completion supported.
- Server provides roadmap schema per visa type with status transitions and progress computation.

2) Checklist
- Visa-type scoped checklist with CRUD. Server validation. Progress indicators and optimistic UI with rollback on failure. i18n messages.

3) AI Docs (Generate + Review)
- Document types: Motivation Letter, CV/Resume, Employer/Reference Letter, Cover Letter, Student/Tourist docs, general immigration letters.
- Generate: RAG-grounded prompts with user profile context. Streamed output, with background job option for long tasks and progress polling.
- Review: Upload/parse PDF/DOCX or paste text. Extract content, run issue detection (missing details, inconsistencies, weak justification), annotate with suggestions and proposed edits.
- Timeouts/retries, user-facing progress and friendly errors.

4) Templates
- Library filtered by visa type and doc type. CRUD, placeholders like {{full_name}}. Validation and i18n.

5) Visa Simulator
- Deterministic rules + scoring engine with transparent explanation. AI used only for narrative explanation and suggestions. Unit tests required.

6) Gov Checks
- Integrations for UK right-to-work and immigration status (or simulated test APIs). Validate share code + DOB. Handle API errors gracefully.

7) Interview Prep (Text + Voice)
- Text mode: realistic questions per visa type; evaluate answers on clarity, completeness, risks.
- Voice mode: speech-to-text, same evaluation pipeline, text-to-speech summary.
- Robust retries and error handling.

8) Documents
- Upload PDF/DOCX, extract entities (name, dates, education, employment, salary) into DB; AI consistency checks and red-flags; show detailed analysis, not just a badge.

9) AI Chat
- 24/7 chatbot grounded with RAG and aware of user profile, roadmap stage, and documents. Multi-language Q/A.

10) Messages & Ask Lawyer
- Reliable messaging. Ask Lawyer creates structured query/case visible to Lawyer. Threaded replies; can convert to consultation or full case.

11) Research & Companies
- Single clear entry to research. UK company search via API or realistic seeded test data.

12) Logout & Navigation
- No 404s; clean redirects; all sidebar links respect role.


9. Lawyer Features
1) Dashboard & Stats
- Real metrics: active clients, open cases, upcoming consultations, revenue. Prominent policy updates.

2) Consultations
- Full CRUD with filters by date/client/status. Calendar integration (basic reminders + ICS export).

3) Lead CRM
- Stages (New, Qualified, Proposal, Won/Lost) with functional filters and stats.

4) Time Tracking or Replacement
- Either robust billable hours per client/case or Case Kanban replacement.

5) Practice / Case Management
- Tasks, deadlines, notes, document links, statuses. Clean UX. No internal errors.

6) Clients
- Reliable client registration. List view with sorting, search, quick access to cases/docs.

7) Financials
- Invoice creation (client, items, currency, status). Reporting (total invoiced/paid/overdue). Friendly error handling.

8) Templates, Analytics, Company Checks
- Lawyer-specific templates. Replace broken analytics with meaningful charts/tables (cases by type, success rates, revenue). Company checks wired to same search as Client.


10. AI and RAG Layer
- AI provider: Ollama preferred, HuggingFace fallback. Streamed responses. Central prompt templates per feature in shared/ai/prompts/ with comments and variables.
- RAG service: REST API for search/query with embeddings prepared for UK/EU immigration guidance. Clear API contract with retries/timeouts.
- Queues: Redis-backed jobs for long operations with progress reporting endpoints.


11. Data Model (high level)
- Users(id, email, role [client|lawyer], locale, profile...)
- Cases(id, clientId, type, stage, status, metadata)
- RoadmapItems(id, caseId, title, description, order, status)
- ChecklistItems(id, caseId, visaType, title, description, status)
- Templates(id, ownerId or role, docType, visaType, name, content, locale)
- Documents(id, userId/caseId, type, s3Key, metadata, extractedEntities)
- Messages(id, threadId, senderId, recipientId, body, attachments, readAt)
- Consultations(id, lawyerId, clientId, datetime, status, notes)
- Leads(id, lawyerId, name, contact, stage)
- Invoices(id, lawyerId, clientId, currency, items[], total, status)
- AIJobs(id, userId, type, status, progress, payload, result)


12. API Contracts (selected examples)
- POST /api/auth/login -> 200 {user, role} | 401
- POST /api/auth/logout -> 204
- GET /api/roadmap/:caseId -> 200 {items[]} (role: client owning case)
- PATCH /api/roadmap/:id -> 200 {item} (status update)
- CRUD /api/checklist
- POST /api/ai/docs/generate -> 202 {jobId} + SSE stream endpoint /api/ai/jobs/:id/stream
- POST /api/ai/docs/review -> 202 {jobId} -> GET /api/ai/jobs/:id
- CRUD /api/templates
- POST /api/simulator/score -> 200 {score, breakdown, suggestions}
- POST /api/gov/rtw -> 200 {result} | 400/422
- CRUD /api/messages and /api/ask-lawyer
- CRUD /api/consultations
- CRUD /api/leads
- CRUD /api/cases
- CRUD /api/invoices


13. Validation and Testing
- Use Zod schemas for request validation; share types with client where possible.
- Automated tests cover: auth + role routing; roadmap/checklist updates; gov checks happy/error paths; messaging/Ask-Lawyer/CRM/invoices; simulator scoring.


14. Environment and Config
- Required env variables:
  - Database: DATABASE_URL
  - Redis: REDIS_URL
  - AI: LOCAL_AI_URL + OLLAMA_MODEL or HUGGINGFACE_API_TOKEN + HF_MODEL
  - RAG: RAG_SERVICE_URL
  - Storage: S3_BUCKET + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (+ S3_ENDPOINT for MinIO)
  - Web: ALLOWED_ORIGINS, SESSION_SECRET, NODE_ENV, PORT
  - Optional: STRIPE_SECRET_KEY
- Railway: separate services per component; health endpoints and readiness.


15. Acceptance Criteria
- No visible crashes or raw 4xx/5xx. Friendly error surfaces with logging context.
- All features in sections 8 and 9 implemented with correct validation and authZ.
- i18n complete for en/uz/ru.
- Apple-style UI consistently applied.
- AI responsive and long tasks queued.
- Tests passing; lint/format clean; deployable to Railway with documented steps.
