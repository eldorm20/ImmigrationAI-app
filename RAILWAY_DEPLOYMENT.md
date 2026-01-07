# Railway Deployment Guide - With Ollama AI

This guide explains how to deploy ImmigrationAI to Railway with automatic Ollama setup.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository with the ImmigrationAI code
- Environment variables ready (see below)

## Deployment Architecture

```
Railroad Deployment:
┌─────────────────────────────────────────┐
│          Railway Services               │
├─────────────────────────────────────────┤
│ App Container          (Node.js)        │
│ - Runs ImmigrationAI server             │
│ - Auto-connects to Ollama               │
│ - Depends on DB, Redis, Ollama          │
├─────────────────────────────────────────┤
│ PostgreSQL             (Database)       │
│ - Stores user data, documents, etc.     │
├─────────────────────────────────────────┤
│ Redis                  (Cache/Queue)    │
│ - Session storage, job queue            │
├─────────────────────────────────────────┤
│ Ollama                 (AI Service)     │
│ - Runs Llama/Mistral models             │
│ - Handles all AI requests               │
│ - Auto-pulls model on startup           │
└─────────────────────────────────────────┘
```

## Step 1: Connect Repository to Railway

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize and select your ImmigrationAI repository
5. Click "Deploy"

## Step 2: Create Services

Railway will auto-detect the Dockerfile. You'll need to add PostgreSQL, Redis, and Ollama:

### Add PostgreSQL

1. In your Railway project, click "+ Add Service"
2. Search for "PostgreSQL"
3. Click "Add PostgreSQL"
4. Railroad will create a postgres service and auto-set `DATABASE_URL`

### Add Redis

1. Click "+ Add Service"
2. Search for "Redis"
3. Click "Add Redis"
4. Railway will auto-set `REDIS_URL`

### Add Ollama (Docker Image)

1. Click "+ Add Service"
2. Select "Docker Image"
3. Enter image: `ollama/ollama:latest`
4. Click "Deploy"
5. Configure the Ollama service:
   - **Port**: 11434 (optional, for external access)
   - **Volume**: Create a volume at `/root/.ollama` for model persistence
   - **Memory**: Allocate at least 4GB RAM (more for faster inference)

## Step 3: Configure Environment Variables

In your main **App** service, set these variables:

```
# Database (auto-set by Railway)
DATABASE_URL=postgresql://...

# Redis (auto-set by Railway)
REDIS_URL=redis://...

# Authentication
JWT_SECRET=your-strong-jwt-secret-min-32-chars
REFRESH_SECRET=your-strong-refresh-secret-min-32-chars

# Ollama AI (connects to ollama service)
LOCAL_AI_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=mistral

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@immigrationai.com

# S3/Storage (optional)
S3_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com

# App Settings
PORT=5000
NODE_ENV=production
APP_URL=https://your-app.railway.app
ALLOWED_ORIGINS=https://your-app.railway.app
LOG_LEVEL=info
```

## Step 4: Configure Service Networking

Make sure services can communicate:

1. **App** service needs to connect to:
   - `postgres:5432` (Database)
   - `redis:6379` (Redis)
   - `ollama:11434` (Ollama AI)

2. Railway automatically creates an internal network, so you can use service names (not IPs)

## Step 5: Allocate Resources

### Recommended Resource Allocation

**App Container**:
- Memory: 1-2 GB
- CPU: Shared (or Pro tier if available)

**Ollama Container**:
- Memory: 4-8 GB (more = faster AI responses)
- CPU: Shared or dedicated (AI inference benefits from CPU)
- Optional: GPU if available

**PostgreSQL**:
- Memory: 512 MB - 1 GB
- CPU: Shared

**Redis**:
- Memory: 256 MB
- CPU: Shared

## Step 6: Deploy

1. Ensure all environment variables are set
2. Go to the "App" service settings
3. Click "Deploy"
4. Watch the deployment logs:
   ```
   ✨ Starting ImmigrationAI Server...
   ⏳ Waiting for database to be ready...
   ✅ Database is ready!
   🔄 Running database migrations...
   🤖 Initializing Ollama AI model...
   📥 Pulling model 'mistral' (this may take a few minutes)...
   ✅ Model 'mistral' successfully pulled!
   ✅ Ollama initialization complete!
   ✨ Starting application server on port 5000...
   ```

## Step 7: Verify Deployment

Once deployed, test the endpoints:

```bash
# Check app health
curl https://your-app.railway.app/health

# Test AI features
curl https://your-app.railway.app/api/ai/status

# Check if Ollama is responding
curl https://your-app.railway.app/api/ai/eligibility/questions
```

## Troubleshooting

### Ollama Service Takes Too Long to Start

Pulling the model for the first time can take 5-30 minutes depending on:
- Model size (Mistral 7B = ~4GB)
- Railway's available bandwidth
- Ollama service memory allocation

Check logs:
```bash
# In Railway dashboard, click on "Ollama" service > "Logs"
# Look for:
# 📥 Pulling model 'mistral'...
```

### Out of Memory Error

If Ollama or app crashes with memory errors:
1. Increase memory allocation in Railway service settings
2. Switch to smaller model: `OLLAMA_MODEL=orca-mini`
3. Check current memory usage in service metrics

### Database Connection Failed

Check:
1. PostgreSQL service is running (green status in Railway)
2. `DATABASE_URL` is set correctly
3. Migrations have completed (check logs)

### Ollama Not Responding

Check:
1. Ollama service is healthy (should show green status)
2. `LOCAL_AI_URL=http://ollama:11434/api/generate` is set correctly
3. Model is pulled: check Ollama logs for "successfully pulled"

## Model Options

If Mistral is too slow or memory-intensive, switch to a lighter model:

```
OLLAMA_MODEL=orca-mini        # Fastest, 2GB
OLLAMA_MODEL=neural-chat      # Balanced, 4GB
OLLAMA_MODEL=mistral          # Good quality, 4GB (recommended)
OLLAMA_MODEL=llama2           # Best quality, 4GB (slower)
```

Update the variable in Railway and redeploy.

## Monitoring

Check service health in Railway dashboard:
- **Green status** = Service running
- **Yellow** = Deploying
- **Red** = Failed (check logs)

Monitor AI performance:
- Response times in app logs
- Memory/CPU usage in service metrics
- Ollama model load in Ollama service logs

## Cost Estimation

Railway pricing (as of 2024):
- **App Container**: ~$5-20/month (depending on CPU/memory)
- **PostgreSQL**: ~$7/month (500MB storage)
- **Redis**: ~$5/month
- **Ollama Container**: ~$10-30/month (depending on resources)
- **Total**: ~$27-62/month for a production setup

*Note: Exact pricing depends on usage. Railway offers $5 free credit/month.*

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Set environment variables
3. ✅ Wait for Ollama to initialize (first deployment ~20-30 min)
4. ✅ Test AI features at `/api/ai/status`
5. ✅ Set up SSL/custom domain
6. ✅ Configure webhooks (Stripe, etc.)
7. ✅ Monitor logs and performance

## Support

For Railway-specific issues:
- Railway Docs: https://docs.railway.app
- Community: https://railway.app/chat

For ImmigrationAI issues:
- Check GitHub Issues
- Review logs in Railway dashboard
