# ImmigrationAI – Walkthrough and Test Guide

Version: 1.0

Purpose
This guide explains the major product flows, how to run the app locally and on Railway, and how to manually verify critical features for demos and QA.

Local Setup
1) Prerequisites: Node 18+, pnpm/npm, Docker (optional), Railway CLI (optional).
2) Environment:
- Copy env.sample to .env and fill:
  - DATABASE_URL=postgres://...
  - REDIS_URL=redis://...
  - LOCAL_AI_URL=http://localhost:11434 (Ollama) or HUGGINGFACE_API_TOKEN=... and HF_MODEL=...
  - RAG_SERVICE_URL=http://localhost:8787
  - S3_BUCKET=..., AWS_ACCESS_KEY_ID=..., AWS_SECRET_ACCESS_KEY=..., S3_ENDPOINT=http://localhost:9000 (MinIO optional)
  - ALLOWED_ORIGINS=http://localhost:5173
  - SESSION_SECRET=... (random)
3) Install and run:
- In repo root: npm install (or pnpm i)
- Start backend: npm run dev:server
- Start frontend: npm run dev:client
- Open http://localhost:5173

Railway Deployment
- Create services: Web (this repo), Postgres, Redis, Ollama (or HF worker), RAG backend, optional S3-compatible storage.
- Set variables from .env in Railway for each service, ensure LOCAL_AI_URL or HF fallback configured.
- Health checks: /health on web service.
- Logs: Use correlation IDs for tracing (x-correlation-id header).

Auth and Role Routing
- Login via /auth; upon success redirect based on role:
  - Client → /dashboard
  - Lawyer → /lawyer/dashboard
- Logout via header menu → lands on /home (or /) with confirmation toast.
- Attempt to access opposite role area should redirect to own dashboard with a permission message.

Client Flows
1) Roadmap
- Navigate: Dashboard → Roadmap panel → View Roadmap.
- Verify: Items load based on case type; mark a step complete; refresh and confirm persisted; progress updates.

2) Checklist
- Navigate: Dashboard → Checklist.
- Create item (visa type = Skilled Worker), validate required fields; edit and delete; progress shows X/Y completed.

3) AI Docs
- Generate: Choose doc type (Motivation Letter), provide profile fields; submit. Observe streamed output within 3s; cancel possible; retry on error shows friendly message.
- Review: Upload CV.pdf; see parsed fields; run review; issues list with suggested fixes.

4) Templates
- Create a template with placeholders ({{full_name}}); save; reuse in Generate.

5) Visa Simulator
- Fill inputs; view deterministic score with breakdown; click "Improve" to view AI suggestions.

6) Gov Checks
- Enter share code + DOB; submit; handle success/failure flows; errors shown clearly.

7) Interview Prep
- Text mode: answer questions; receive structured feedback.
- Voice mode: record answer; see transcript; receive spoken summary.

8) Documents
- Upload PDF/DOCX; entities extracted; AI consistency analysis displayed; link to related roadmap items.

9) AI Chat
- Ask immigration questions; RAG-grounded answers referencing guidance; multi-language test (Uzbek/Russian).

10) Messages & Ask Lawyer
- Send messages reliably; create Ask Lawyer case; lawyer replies; convert to consultation.

11) Research & Companies
- Single entry from sidebar; search UK company (e.g., "Apple Ltd"); realistic results appear; view details.

12) Navigation
- Test all sidebar links for role; no 404 after logout; proper redirects.

Lawyer Flows
1) Dashboard & Stats
- Stats display counts for active clients, open cases, upcoming consultations, revenue. Policy updates visible.

2) Consultations
- Create/edit/delete; filter by date/client/status; add reminder; export to ICS.

3) Lead CRM
- Leads visible; move across stages; filters functional.

4) Time Tracking or Replacement
- If enabled: start/stop timers per client/case; view totals; otherwise verify Case Kanban works.

5) Practice / Case Management
- Create case; add tasks with deadlines; notes; attach documents; update statuses; progress calculated.

6) Clients
- Register client; list view with search/sort; access their cases/docs quickly.

7) Financials
- Create invoice with items, currency; mark paid; reports show totals and overdue amounts.

8) Templates, Analytics, Company Checks
- Lawyer templates CRUD; analytics charts (cases by type, success rates, revenue) load; company checks wired to same client-side logic.

Testing & QA
- Automated: run npm test (see tests/). Covers: auth routing, roadmap/checklist updates, gov checks, messaging/CRM/invoices, simulator scoring.
- Manual smoke:
  - Missing AI provider shows graceful error but app runs.
  - RAG unavailable: chatbot degrades with cached/basic answers and clear message.
  - Upload parse failures: friendly errors with retry.

Troubleshooting
- Check /health for DB/Redis status.
- Inspect logs with correlation IDs. Include x-correlation-id header when reproducing.
- Verify env vars for AI and S3 if features fail.
