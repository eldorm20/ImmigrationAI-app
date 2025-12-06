# Pre-GitHub Push Checklist

## Files Created/Updated for Railway Deployment

### New Files
- ✅ `.github/workflows/ci.yml` — Updated with Railway deploy job
- ✅ `DEPLOYMENT_RAILWAY.md` — Complete Railway deployment guide
- ✅ `.env.example` — Environment variables template

### Previously Implemented
- ✅ `tools/llm_finetune/` — Full LoRA fine-tuning toolkit
  - `finetune_lora.py` — Training script
  - `merge_lora.py` — Merge script for serving
  - `requirements.txt` — Python dependencies
  - `README.md` — Fine-tuning quickstart
  - `README_SERVE.md` — Serving instructions
  - `docker-compose.tgi.yml` — TGI local inference
  - `example_data/train.jsonl` — Example dataset
- ✅ `server/lib/ai.ts` — AI provider abstraction (OpenAI, HF Inference, self-hosted)
- ✅ `shared/schema.ts` — Added users.metadata for subscriptions
- ✅ `migrations/0002_add_user_metadata.sql` — DB migration
- ✅ `server/routes/webhooks.ts` — Stripe webhook handling
- ✅ `server/routes/consultations.ts` — Consultation API
- ✅ `client/src/components/consultation-panel.tsx` — Consultation UI
- ✅ `server/index.ts` — Hardened startup, health check
- ✅ Build passes: `npm run build` ✓ Success
- ✅ Type check passes: `npm run check` ✓ Clean

## Pre-Push Steps

1. **Verify build locally** (done ✓)
   ```bash
   npm run check  # TypeScript check
   npm run build  # Full build
   ```

2. **Create a new git branch** (optional, recommended)
   ```bash
   git checkout -b deploy/railway-ready
   ```

3. **Stage and commit files**
   ```bash
   git add .
   git commit -m "feat: add Railway deployment, open-source AI, and fine-tuning toolkit

   - GitHub Actions CI with Railway deploy job
   - Railway deployment guide with env vars and setup steps
   - Open-source LLM provider support (HF Inference, self-hosted)
   - LoRA fine-tuning toolkit with docker-compose for TGI
   - Environment variables template
   - Consultation system with full CRUD
   - Stripe webhook integration
   - Improved server startup and health checks"
   ```

4. **Push to GitHub**
   ```bash
   # If on a branch:
   git push -u origin deploy/railway-ready
   # Then create a Pull Request to main

   # Or directly to main (if ready):
   git push origin main
   ```

5. **Verify CI runs** (in GitHub)
   - Go to repo → Actions tab
   - Watch the CI workflow run (lint, test, build)
   - All should pass

6. **Set up Railway** (after PR/push)
   - Create Railway project
   - Link GitHub repo
   - Add PostgreSQL and Redis plugins
   - Set environment variables (see DEPLOYMENT_RAILWAY.md)
   - Run migrations
   - Deploy!

## Quick Reference: Environment Variables for Railway

### Required (get from Railway plugins auto-created)
- `DATABASE_URL` — from PostgreSQL plugin
- `REDIS_URL` — from Redis plugin

### Create/Set These
- `JWT_SECRET` — generate with `openssl rand -base64 32`
- `APP_URL` — your Railway domain (e.g., `https://myapp.up.railway.app`)
- `NODE_ENV` — set to `production`

### For AI (pick one approach, see DEPLOYMENT_RAILWAY.md)
- **HF Inference (easiest)**: `HUGGINGFACE_API_TOKEN` + `HF_MODEL`
- **Self-hosted**: `HF_INFERENCE_URL` + `HUGGINGFACE_API_TOKEN`
- **OpenAI (paid)**: `OPENAI_API_KEY`

### Optional (if using features)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — for payments
- `SENDGRID_API_KEY` or `SMTP_*` — for email

## What's Ready to Deploy

✅ Full-stack app with React frontend + Express backend
✅ PostgreSQL + Redis integration
✅ Authentication (JWT + sessions)
✅ Consultation booking system
✅ Stripe payments + webhooks
✅ Email queue (Bull + Nodemailer)
✅ Open-source AI integration (Hugging Face or self-hosted)
✅ Docker multi-stage build optimized for Railway
✅ Health check endpoint
✅ Graceful shutdown
✅ Database migrations
✅ GitHub Actions CI/CD

## Known Limitations (Free-Tier)

- Railway free-tier has no GPU; large LLM inference should use external API (HF Inference recommended)
- Free HF Inference API is rate-limited
- Smaller models (1–3B) or community models recommended for cost-effective inference

## Recommendations

1. Start with Hugging Face Inference API for AI (no GPU cost)
2. If you need custom AI tuning, use Colab for free LoRA training
3. Monitor Railway logs for any runtime issues
4. Set up backups for PostgreSQL data
5. Enable rate-limiting in production (already in code)

---

Ready to push? Run: `git push origin main` (or create a PR first)
