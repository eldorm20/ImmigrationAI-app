# 🚀 Railway Deployment - Quick Start Guide

Your code is now on GitHub and ready for Railway deployment. Follow these steps to get your app live with open-source AI.

## Step 1: Connect to Railway (5 minutes)

1. Go to [railway.app](https://railway.app) → Sign up/Login
2. Create a new project
3. Click "Deploy from GitHub"
4. Connect your account and select: **eldorm20/ImmigrationAI-app**
5. Select branch: **main**
6. Click "Deploy"

Railway will auto-detect the Dockerfile and start building.

## Step 2: Add Services (3 minutes)

In your Railway project dashboard:

1. Click **"Add Plugin"** → **PostgreSQL**
   - This auto-creates `DATABASE_URL`
   
2. Click **"Add Plugin"** → **Redis**
   - This auto-creates `REDIS_URL`

Wait for both to initialize (green status).

## Step 3: Set Environment Variables (5 minutes)

In Railway → Project → Variables, paste these:

```
NODE_ENV=production
JWT_SECRET=<run: openssl rand -base64 32>
ALLOWED_ORIGINS=https://<your-railway-domain>
```

Note: Railway will auto-create `DATABASE_URL` and `REDIS_URL` from plugins. Verify they're set before deploying.

### Get Your Values

**JWT_SECRET** (run locally):
```bash
openssl rand -base64 32
```

**ALLOWED_ORIGINS**:
- After first deployment, Railway gives you a domain (e.g., `immigrationai-app-production-xxxx.up.railway.app`)
- Set this: `https://immigrationai-app-production-xxxx.up.railway.app`
- The app will auto-allow this origin for CORS

**HUGGINGFACE_API_TOKEN** (optional, for AI):
1. Go to [huggingface.co](https://huggingface.co) → sign up
2. Settings → Access Tokens → Create new token (read)
3. Set in Railway: `HUGGINGFACE_API_TOKEN=hf_<your-token>`

**HF_MODEL** (optional, if using HuggingFace AI):
- Set: `HF_MODEL=OpenAssistant/replit-1b-instruct`

### Optional: Payments & Email

If you want payments:
```
STRIPE_SECRET_KEY=sk_test_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-secret>
```

If you want email:
```
SENDGRID_API_KEY=<your-sendgrid-key>
```

## Step 4: Run Database Migration (2 minutes)

Using Railway CLI locally:

```bash
npm install -g railway
railway login
railway link
railway run npm run db:migrate
```

Or via Railway UI (if available in your plan):
1. Deployments → Run Command
2. Input: `npm run db:migrate`
3. Run

## Step 5: Verify Deployment (1 minute)

Once deployment shows as active (green):

```bash
# Test health endpoint
curl https://<your-domain>/health

# Should return 200 OK
```

## Step 6: Test AI Feature

```bash
curl -X POST "https://<your-domain>/api/ai/eligibility" \
  -H "Content-Type: application/json" \
  -d '{
    "country":"Canada",
    "visaType":"Student",
    "age":24,
    "education":"Bachelor",
    "workExperience":0,
    "languageProficiency":true,
    "jobOffer":false,
    "financialSupport":true
  }' | jq .
```

## GitHub Actions Auto-Deploy (Optional)

To automatically deploy on every push to main:

1. Railway → Project Settings → API Keys
2. Copy your Railway API Key
3. GitHub → Settings → Secrets → `RAILWAY_API_KEY` (paste value)
4. Done! Future commits to main will auto-deploy via GitHub Actions

## Free AI Models (Tested & Working)

| Model | Size | Speed | Quality | License |
|-------|------|-------|---------|---------|
| `OpenAssistant/replit-1b-instruct` | 1B | Fast | Good | MIT |
| `theblackcat102/guanaco-1.3b` | 1.3B | Fast | Good | Apache 2.0 |
| `gpt-j-6b` | 6B | Slow on CPU | Better | MIT |
| `Mistral-7B-Instruct` | 7B | Slow on CPU | Best | Apache 2.0 |

Note: All are free via Hugging Face Inference API (rate-limited).

## Troubleshooting

### App won't deploy
- Check logs: Railway → Deployments → Logs
- Verify Node version (20+ required)
- Ensure `DATABASE_URL` and `REDIS_URL` are auto-set by plugins

### AI endpoint returns error
- Verify `HUGGINGFACE_API_TOKEN` is correct
- Test HF directly:
```bash
curl -X POST "https://api-inference.huggingface.co/models/OpenAssistant/replit-1b-instruct/api/v1/generate" \
  -H "Authorization: Bearer $HUGGINGFACE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"Hello"}'
```

### Migrations fail
- Verify `DATABASE_URL` is accessible
- Check PostgreSQL plugin is running (green status)
- Try: `railway run npm run db:migrate` with Railway CLI

### Queue jobs not processing
- Verify `REDIS_URL` is set and Redis plugin is active
- Check logs for queue worker errors
- Restart deployment: Railway → Services → Restart

## Next: Fine-tune AI Model

Want better AI performance? Train a custom model:

```bash
# 1. Install Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r tools/llm_finetune/requirements.txt

# 2. Prepare training data (edit tools/llm_finetune/example_data/train.jsonl)

# 3. Run fine-tuning (or use free Colab)
python tools/llm_finetune/finetune_lora.py \
  --model_name_or_path "OpenAssistant/replit-1b-instruct" \
  --train_file tools/llm_finetune/example_data/train.jsonl \
  --output_dir output/lora-model \
  --num_train_epochs 1

# 4. Merge and push to HF Hub
python tools/llm_finetune/merge_lora.py \
  --base_model "OpenAssistant/replit-1b-instruct" \
  --adapter_dir output/lora-model \
  --output_dir output/merged-model

# 5. Push to HF Hub (see tools/llm_finetune/README.md for details)
```

See `tools/llm_finetune/README.md` for full fine-tuning guide.

## Support Resources

- Railway Docs: https://docs.railway.app
- Hugging Face Docs: https://huggingface.co/docs
- App Repo: https://github.com/eldorm20/ImmigrationAI-app
- Deployment Guide: `DEPLOYMENT_RAILWAY.md` in repo

---

**You're all set!** 🎉 

Your app is on GitHub, ready to deploy, and configured with free, open-source AI. 

Next: Log into Railway, link your repo, add plugins, set env vars, run migrations, and go live!
