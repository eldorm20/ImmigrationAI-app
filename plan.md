# ImmigrationAI – Implementation Plan

Version: 1.0

Overview
This plan sequences work into phases: Planning → Implementing → Verifying. It maps the current repository to the target spec in requirements.md and defines concrete tasks with priorities.

Repo quick scan (current state)
- Backend: Express + TS in server/ with robust startup, CORS/helmet, logging, errorHandler, Socket.IO bootstrap, migrations and Redis worker hooks present. Health endpoint exists. Various routes likely exist under server/routes/.
- Frontend: Vite + React + TS in client/. Multiple pages exist for client and lawyer dashboards, interviews, research, etc. Needs cohesive design system, i18n, and full data wiring per spec.
- Database/migrations: migrations/ and server/migrations/ exist; drizzle.config.ts present.
- Docs: many deployment and fix documents exist. Missing up-to-date product requirements and walkthrough (added here).

Phase 0 – Foundations (Week 0)
0.1 Create requirements.md, plan.md, walkthrough.md skeleton. [DONE]
0.2 Verify env variables and Railway service matrix; ensure health checks and logging with correlation IDs. [Partially present]
0.3 Add shared i18n scaffolding for en/uz/ru (client and server messages). Add design tokens/theme.
0.4 Ensure errorHandler returns user-friendly messages; add standardized error response shape.

Phase 1 – Auth, Roles, Navigation (Week 1)
1.1 Audit server auth middleware and session handling; ensure secure cookies and role-based guard per route group.
1.2 Frontend router guards: redirect to role dashboards on login; clean logout with proper landing.
1.3 Navigation and sidebar link visibility by role; remove 404s.
1.4 Unit tests: auth flows and role routing.

Phase 2 – Client Core (Week 2)
2.1 Roadmap: fetch from DB by case; status updates; progress. Wire to UI timeline with persistence.
2.2 Checklist: visa-type scoped CRUD with validation and progress indicators.
2.3 Templates: CRUD with placeholders and multi-language; reusable in AI Docs.
2.4 Visa Simulator: deterministic scoring engine + tests; AI explanation.

Phase 3 – AI Docs and Interview (Week 3)
3.1 AI Docs Generate: RAG grounding; streaming responses; background job w/ progress.
3.2 AI Docs Review: PDF/DOCX parsing, issue highlighting, suggestions, proposed edits.
3.3 Interview Prep: question bank per visa; evaluator; voice mode with STT + TTS integration.

Phase 4 – Documents & Gov Checks (Week 4)
4.1 Documents: upload, parse, extract entities, AI consistency checks; analysis UI.
4.2 Gov Checks: UK right-to-work/status (simulate if needed) with validation and error handling.

Phase 5 – Messaging and Research (Week 5)
5.1 Messaging: reliable threads with Ask Lawyer flow; Socket.IO and retries.
5.2 Research & Companies: consolidate entry; UK company search via API or test data shared with lawyer.

Phase 6 – Lawyer Suite (Week 6)
6.1 Dashboard stats + policy updates module.
6.2 Consultations CRUD + filters + reminders/ICS.
6.3 Lead CRM with stages and filters.
6.4 Practice/Case management: tasks, deadlines, notes, document links, statuses.
6.5 Clients: registration + list with sorting/search/quick links.
6.6 Financials: invoices + reporting; friendly errors.
6.7 Templates, Analytics, Company Checks parity with client.

Phase 7 – AI/RAG/Queues Hardening (Week 7)
7.1 Retry/timeout policies; backpressure; circuit breakers.
7.2 Centralize prompt templates and variables in shared/ai/prompts/.
7.3 Background worker reliability and idempotency; job status endpoints.

Phase 8 – i18n, Design System, Polishing (Week 8)
8.1 Apply Apple-style design system across app; consistent components and transitions.
8.2 Complete i18n coverage for en/uz/ru including errors and validation.
8.3 Accessibility checks (focus states, color contrast, screen reader labels).

Phase 9 – Testing, QA, and Deployment (Week 9)
9.1 Unit/integration tests for critical flows noted in requirements.
9.2 Lint/format passes; types clean.
9.3 Railway deployment with separate services and environment docs; smoke tests.

Deliverables per phase
- Updated code, migrations, tests.
- Documentation updates (requirements.md, plan.md, walkthrough.md).
- Progress checklists in QA_RUN.md.

Risks and Mitigations
- AI service latency/outage → fallback providers, background jobs, cached responses.
- i18n coverage gaps → static analysis and CI checks for missing keys.
- Data model gaps → incremental migrations with backfills and safe defaults.

Success Criteria
- Matches requirements.md acceptance criteria.
- No raw 4xx/5xx; friendly UX; production-ready on Railway.
