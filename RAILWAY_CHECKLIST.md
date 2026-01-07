# 🚀 Railway Deployment Checklist - Ollama Auto-Setup

## Pre-Deployment ✅

- [ ] Code pushed to GitHub (main branch)
- [ ] All environment variables documented
- [ ] Stripe keys obtained (from API Keys section, NOT restricted keys)

## Railway Setup - Step by Step

### 1. Create Railway Project
```
Railway Dashboard → New Project → Deploy from GitHub
→ Select ImmigrationAI repository → Deploy
```
- [ ] Project created
- [ ] GitHub connected

### 2. Add PostgreSQL Service
```
+ Add Service → PostgreSQL
```
- [ ] PostgreSQL added
- [ ] `DATABASE_URL` auto-set ✓

### 3. Add Redis Service
```
+ Add Service → Redis
```
- [ ] Redis added
- [ ] `REDIS_URL` auto-set ✓

### 4. Add Ollama Service
```
+ Add Service → Docker Image
Enter: ollama/ollama:latest
```
- [ ] Ollama service added
- [ ] Volume created: `/root/.ollama`
- [ ] Memory allocated: 4-8 GB

### 5. Configure App Service Environment

Set these environment variables:

**Core Settings**
```
NODE_ENV=production
PORT=5000
APP_URL=https://your-app-name.railway.app
ALLOWED_ORIGINS=https://your-app-name.railway.app
```
- [ ] Core settings added

**Authentication (CHANGE THESE!)**
```
JWT_SECRET=<generate strong random 32+ char string>
REFRESH_SECRET=<generate another strong random 32+ char string>
```
- [ ] JWT secrets set
- [ ] Not using defaults

**Ollama AI Configuration**
```
LOCAL_AI_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=mistral
```
- [ ] LOCAL_AI_URL set to ollama service
- [ ] OLLAMA_MODEL specified (mistral/llama2/neural-chat)

**Stripe Payment (if using payments)**
```
STRIPE_SECRET_KEY=sk_test_51c1w8...        (API Keys > Standard > Secret key)
STRIPE_PUBLIC_KEY=pk_test_51c1w8...        (API Keys > Standard > Publishable key)
STRIPE_WEBHOOK_SECRET=whsec_...            (Settings > Webhooks > Signing secret)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
```
- [ ] Secret key (sk_test_...) - NOT restricted (mk_...)
- [ ] Public key (pk_test_...)
- [ ] Webhook secret set
- [ ] Price IDs configured

**Email (SMTP)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@immigrationai.com
```
- [ ] SMTP credentials configured
- [ ] Email from address set

**S3/File Storage (optional)**
```
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com
```
- [ ] S3 configured (if using file uploads)
- [ ] Access keys correct

**Logging**
```
LOG_LEVEL=info
```
- [ ] Logging level set

### 6. Allocate Service Resources

**App Service**
- [ ] Memory: 1-2 GB
- [ ] CPU: Shared

**Ollama Service** (IMPORTANT)
- [ ] Memory: 4-8 GB (critical for AI performance)
- [ ] CPU: Shared or higher if available
- [ ] Volume: `/root/.ollama` (for model persistence)

**PostgreSQL**
- [ ] Memory: 512 MB - 1 GB
- [ ] Storage: 5 GB minimum

**Redis**
- [ ] Memory: 256 MB

### 7. Deploy

```
App Service → Deploy
```
- [ ] Deployment started
- [ ] Monitoring logs...

## Deployment Logs - What to Expect

### Initial App Startup (1-2 min)
```
✨ Starting ImmigrationAI Server...
⏳ Waiting for database to be ready...
✅ Database is ready!
🔄 Running database migrations...
```

### Ollama Initialization (5-30 min first time)
```
🤖 Initializing Ollama AI model...
📥 Pulling model 'mistral'...
  (downloading ~4GB model file...)
✅ Model 'mistral' successfully pulled!
✅ Ollama initialization complete!
✨ Starting application server on port 5000...
```

- [ ] All logs show success
- [ ] No error messages
- [ ] Server started

## Post-Deployment Verification ✅

### Check Service Status
- [ ] App: Green (healthy)
- [ ] PostgreSQL: Green
- [ ] Redis: Green
- [ ] Ollama: Green (may take time to pull model)

### Test Endpoints

**Health Check**
```bash
curl https://your-app.railway.app/health
```
- [ ] Returns 200 OK
- [ ] Response time < 1s

**Home Page**
```
https://your-app.railway.app
```
- [ ] Loads successfully
- [ ] No console errors (F12)

**AI Status**
```bash
curl https://your-app.railway.app/api/ai/status
```
- [ ] Shows Ollama as enabled
- [ ] Model name matches OLLAMA_MODEL

**Test AI Feature**
```bash
curl https://your-app.railway.app/api/ai/eligibility/questions
```
- [ ] Returns eligibility questions
- [ ] Response time: 1-5 seconds first time

### Monitor Logs
```
Railway Dashboard → App Service → Logs
```
- [ ] Watch for errors (red text)
- [ ] Check Ollama service logs for model load confirmation
- [ ] Verify API requests are working

## Configuration Tasks

### Domain Setup
- [ ] Add custom domain in Railway (optional)
- [ ] Update DNS if using custom domain
- [ ] Test HTTPS certificate
- [ ] Update APP_URL if using custom domain

### Stripe Webhook
```
https://your-app.railway.app/api/stripe/webhook
```
- [ ] Add webhook endpoint to Stripe Dashboard
- [ ] Copy webhook signing secret
- [ ] Add STRIPE_WEBHOOK_SECRET to Railway env vars
- [ ] Test webhook delivery

### Email Verification
- [ ] Send test email through app
- [ ] Verify it arrives
- [ ] Check spam folder

## Troubleshooting Checklist

### Problem: Ollama Takes Too Long
- [ ] This is NORMAL on first deployment
- [ ] Model pulling 5-30 minutes depending on model size
- [ ] Watch logs: `📥 Pulling model...`
- [ ] Action: Wait, do NOT restart

### Problem: Connection Refused (Ollama)
- [ ] Check: Ollama service status (green?)
- [ ] Check: LOCAL_AI_URL=http://ollama:11434/api/generate
- [ ] Check: Ollama logs for errors
- [ ] Action: Increase Ollama memory allocation

### Problem: Database Connection Failed
- [ ] Check: PostgreSQL service running (green)
- [ ] Check: DATABASE_URL env var set
- [ ] Check: Migrations completed in logs
- [ ] Action: Restart PostgreSQL service

### Problem: Out of Memory Errors
- [ ] Check: Service memory allocation
- [ ] For Ollama: Increase to 6-8 GB
- [ ] For App: Increase to 2 GB
- [ ] Alternative: Use lighter model (OLLAMA_MODEL=orca-mini)

### Problem: Stripe API Key Errors
- [ ] Check: Using STANDARD keys (sk_test_, pk_test_)
- [ ] NOT using restricted keys (mk_...)
- [ ] Check: Dashboard > Developers > API Keys
- [ ] Action: Copy correct key, update Railway env var, redeploy

### Problem: High Response Times
- [ ] Check: Ollama memory allocation (4 GB minimum)
- [ ] Check: Model loaded (check Ollama logs)
- [ ] Action: Increase resource allocation
- [ ] Alternative: Use lighter model

## Performance Monitoring

### Expected Response Times
- **Eligibility Questions**: < 2s
- **Document Generation**: 5-30s (depends on model & prompt)
- **Translation**: 3-15s
- **Chat/Consultation**: 3-15s

### Resource Usage
- **App**: 200-500 MB RAM typical
- **Ollama**: 2-6 GB RAM when processing requests
- **PostgreSQL**: 100-300 MB RAM
- **Redis**: 20-50 MB RAM

### Monitor in Railway
```
Dashboard → Service → Metrics
```
- [ ] Memory usage normal
- [ ] CPU not constantly at 100%
- [ ] Network throughput reasonable

## Success Indicators 🎉

Your deployment is successful when:
- [ ] App loads at your Railway URL
- [ ] Health check returns 200
- [ ] AI status shows Ollama enabled
- [ ] Eligibility questions endpoint responds
- [ ] Can generate documents (takes 10-30s)
- [ ] Can translate text
- [ ] Can chat with AI consultant
- [ ] No errors in logs

## Next Steps

After successful deployment:

1. **Set up SSL/Domain**
   - Add custom domain in Railway
   - Configure DNS
   - Test HTTPS

2. **Configure Webhooks**
   - Stripe webhook endpoint
   - Email notifications (optional)
   - Log aggregation (optional)

3. **Optimization**
   - Monitor performance
   - Adjust resource allocation if needed
   - Switch models if needed

4. **Backup & Maintenance**
   - Enable PostgreSQL backups
   - Monitor disk usage
   - Set up alerts

## Estimated Time

| Task | Time |
|------|------|
| GitHub Setup | 5 min |
| Services Setup (3 services) | 10 min |
| Environment Variables | 15 min |
| Initial Deployment | 5 min |
| Ollama Model Pull (first time) | 15-30 min |
| Verification & Testing | 10 min |
| **Total** | **60-90 min** |

## Support

- Railway Docs: https://docs.railway.app
- Ollama Help: https://ollama.ai
- GitHub Issues: https://github.com/eldorm20/ImmigrationAI-app
- Community Chat: Railway Discord

---

**Last Updated**: December 11, 2025
**Status**: Ready for Production
