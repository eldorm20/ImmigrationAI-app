# Railway Deployment Guide

This guide walks you through deploying the Immigration AI application to Railway (free tier) with all required services and environment configuration.

## Prerequisites

- GitHub account with your repo pushed (main/master branch)
- Railway account (free tier available)
- Hugging Face account (optional, for AI inference)
- Stripe account (optional, for payments)

## Step 1: Create Railway Project and Link GitHub

1. Go to [railway.app](https://railway.app) and sign up/login
2. Create a new project
3. Click "Deploy from GitHub" and connect your repository
4. Select the branch (main or master)
5. Railway will detect the Dockerfile and build automatically

## Step 2: Provision Required Services

In your Railway project dashboard, add these plugins:

### PostgreSQL Database
1. Click "Add Plugin" → PostgreSQL
2. Railway automatically creates `DATABASE_URL` environment variable
3. Verify it's set and accessible

### Redis Cache
1. Click "Add Plugin" → Redis
2. Railway automatically creates `REDIS_URL` environment variable

## Step 3: Configure Environment Variables

In Railway → Project Settings → Variables, add these required variables:

### Core Application
```
NODE_ENV=production
```

### Database & Cache
- `DATABASE_URL` — (auto-set by PostgreSQL plugin, verify it exists)
- `REDIS_URL` — (auto-set by Redis plugin, verify it exists)

### Authentication & Security
```
JWT_SECRET=<generate-a-random-string-or-use-openssl-rand-base64-32>
APP_URL=https://<your-railway-domain>.up.railway.app
```

### Email/SMTP
Choose one of:
- SendGrid:
  - `SENDGRID_API_KEY=<your-sendgrid-key>`
- SMTP (generic):
  - `SMTP_HOST=smtp.example.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=your-email@example.com`
  - `SMTP_PASS=your-password`

### Stripe (if using payments)
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```
Note: Configure webhook endpoint in Stripe dashboard to: `https://<your-railway-domain>/api/webhooks/stripe`

### AI/LLM Configuration (choose one approach)

#### Option A: Use Hugging Face Inference API (easiest, no GPU needed)
```
HUGGINGFACE_API_TOKEN=hf_xxxxx
HF_MODEL=OpenAssistant/replit-1b-instruct
```
Replace `HF_MODEL` with a community model of choice (examples: `openassistant/oasst-sft-1-pythia-12b`, `theblackcat102/guanaco-1.3b`). Check licenses before use.

#### Option B: Self-hosted inference endpoint
```
HUGGINGFACE_API_TOKEN=hf_xxxxx
HF_INFERENCE_URL=https://your-inference-server.example.com/v1/models/mymodel:predict
```

#### Option C: OpenAI (optional, paid)
```
OPENAI_API_KEY=sk-xxxxx
```

## Step 4: Run Database Migrations

After environment variables are set and services are running:

### Option A: Using Railway CLI locally
```bash
# Install Railway CLI if not already done
npm install -g railway

# Login and select project
railway login
railway link

# Run migration
railway run npm run db:migrate
```

### Option B: Using Railway UI one-time command
1. In Railway project → Deployments
2. Click "Run Command" (if available in your plan)
3. Command: `npm run db:migrate`

### Option C: Manual migration via SSH/logs
- Connect to your deployment and run the migration manually

## Step 5: Verify Deployment

Once deployment is live:

### Health Check
```bash
curl https://<your-railway-domain>/health
# Should return 200 OK
```

### Test API
```bash
# Example: test eligibility check (if endpoint exists)
curl -s -X POST "https://<your-railway-domain>/api/ai/eligibility" \
  -H "Content-Type: application/json" \
  -d '{"country":"Canada","visaType":"Student","age":24,"education":"Bachelor","workExperience":0,"languageProficiency":true,"jobOffer":false,"financialSupport":true}'
```

## Step 6: Setup GitHub Actions Deployment (Optional Auto-Deploy)

To enable automatic deployment on push to main:

1. In Railway → Project Settings → API Key
2. Copy your Railway API Key
3. Go to your GitHub repo → Settings → Secrets and variables → Actions
4. Add secret: `RAILWAY_API_KEY` with the value from Railway
5. The `.github/workflows/ci.yml` workflow will automatically deploy on push to main

## Free-Tier Limitations & Tips

### Railway Free Tier
- Limited compute resources (no GPU)
- Shared CPU/memory
- Suitable for: light to moderate traffic applications

### AI Inference Considerations
- **Large models on Railway**: 7B+ models are too large/slow for Railway free CPU. Use external inference endpoints (Hugging Face API, third-party GPU services).
- **Recommended**: Use smaller community models (1–3B) or access Hugging Face Inference API for hosted inference.
- **Best practice**: Fine-tune a small model with LoRA using free Colab, push to HF, and call HF Inference API from Railway.

### Cost Savings
- Use Hugging Face free inference tier (rate-limited but no cost)
- Use community/open-source models (avoid paid APIs)
- Monitor queue workers; disable if not needed
- Set appropriate resource limits in Railway

## Troubleshooting

### Build Fails
- Check logs: Railway → Deployments → View logs
- Common issues:
  - Missing environment variables
  - Node version mismatch (ensure Node 20+)
  - Dependency lock file issues (try `npm ci`)

### Migrations Don't Run
- Check if database is accessible: verify `DATABASE_URL`
- Check logs: `railway run npm run db:migrate`
- Ensure schema is compatible with database provider

### AI Endpoints Return Errors
- Verify `HUGGINGFACE_API_TOKEN` and `HF_MODEL` are set correctly
- Test HF endpoint directly: `curl -X POST "https://api-inference.huggingface.co/models/<model>/api/v1/generate" ...`
- Check server logs for API errors

### Email Not Sending
- Verify SMTP or SendGrid credentials in environment
- Check email queue: ensure Redis is running
- Check logs for queue worker errors

## Next Steps

1. **Fine-tune AI models**: Use `tools/llm_finetune/finetune_lora.py` and Colab for custom training
2. **Monitor logs**: Set up Railway alerts or use `railway logs` command
3. **Scale**: As traffic grows, upgrade Railway plan or move to dedicated GPU for inference
4. **Webhooks**: Configure Stripe, SendGrid, or other webhooks to point to your Railway domain

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [Railway CLI Reference](https://docs.railway.app/develop/cli-help)
- [App Source Code](./README.md)
