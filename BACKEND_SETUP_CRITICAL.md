# Backend Configuration & Setup Guide

## CRITICAL: Why Features Are Not Working

All backend code EXISTS and is properly implemented. However, **features fail silently** because:

1. **AI Services (Chat, Translation, Document Generation) Don't Work** ❌
   - Reason: No AI provider configured (Ollama not running or LOCAL_AI_URL wrong)
   - Fix: Configure LOCAL_AI_URL or HuggingFace API credentials

2. **Subscription/Payment Features Don't Update** ❌
   - Reason: Stripe webhook not configured or webhook signing secret missing
   - Fix: Add STRIPE_WEBHOOK_SECRET and configure webhook in Stripe dashboard

3. **Document Upload Fails** ❌
   - Reason: S3 credentials incomplete or bucket not accessible
   - Fix: Configure S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

4. **Consultations Don't Load Lawyers** ❌
   - Reason: Lawyer data not in database or endpoint returning 403/401
   - Fix: Seed lawyer data and verify auth tokens

---

## Required Environment Variables

### AI Providers (At least ONE required)

```bash
# Option 1: Ollama Local AI (REQUIRED for chat/translate/generate)
LOCAL_AI_URL=http://ollama-service:11434/api/generate
OLLAMA_MODEL=neural-chat  # or "mistral", "llama2", etc.

# Option 2: HuggingFace (Fallback if Ollama down)
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxx
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.1
HF_INFERENCE_URL=  # Optional: custom endpoint
```

**Current Status in Railway:**
- LOCAL_AI_URL: ✅ Configured
- OLLAMA_MODEL: ✅ Set to "neural-chat"
- HUGGINGFACE_API_TOKEN: ❌ Not configured (no backup if Ollama fails)

**Fix Needed:** Add HuggingFace credentials as fallback

---

### Stripe Payment Processing (REQUIRED for subscriptions)

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Stripe Webhook Configuration
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # From Stripe Dashboard → Webhooks

# Plan Price IDs (from Stripe → Products)
STRIPE_PRO_PRICE_ID=price_1234567890
STRIPE_PREMIUM_PRICE_ID=price_0987654321
```

**Current Status in Railway:**
- STRIPE_SECRET_KEY: ✅ Configured
- STRIPE_WEBHOOK_SECRET: ❌ **MISSING** (webhooks not validated)
- STRIPE_PRO_PRICE_ID: ❌ **MISSING** (checkout fails)
- STRIPE_PREMIUM_PRICE_ID: ❌ **MISSING** (checkout fails)

**Impact:** 
- ❌ Cannot checkout
- ❌ Subscription status never updates
- ❌ Users always appear as "free" tier

**Fix Needed:** 
1. Get plan price IDs from Stripe dashboard
2. Add STRIPE_WEBHOOK_SECRET from webhook configuration
3. Set up webhook in Stripe to: `https://your-domain/webhooks/webhook`

---

### AWS S3 / Storage (REQUIRED for document upload)

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# S3 Bucket
S3_BUCKET=immigration-ai-documents

# For Railway Storage (not AWS S3)
S3_ENDPOINT=https://storage.railway.app
```

**Current Status in Railway:**
- S3_BUCKET: ✅ Configured
- AWS_ACCESS_KEY_ID: ✅ Configured
- AWS_SECRET_ACCESS_KEY: ✅ Configured
- S3_ENDPOINT: ❌ Unclear if Railway storage is actually accessible

**Impact:**
- ❌ Document upload fails (returns 503)
- ✅ Local fallback to `/uploads` directory works

**Fix Needed:** Test S3 connection in Railway logs

---

### Email Configuration (REQUIRED for notifications)

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@immigrationai.com
SMTP_SECURE=true
```

**Current Status in Railway:**
- SMTP_HOST: ❌ Not configured
- Impact: Consultation requests, payment confirmations not emailed

---

### Database & Cache (REQUIRED for core functionality)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/immigration_ai
REDIS_URL=redis://localhost:6379
```

**Current Status in Railway:**
- DATABASE_URL: ✅ Configured
- REDIS_URL: ✅ Configured

---

### Core Application Settings

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Frontend URLs
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# API Configuration
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
API_RATE_LIMIT=100  # requests per 15 minutes

# Middleware
ENABLE_CORS=true
TRUST_PROXY=1
```

**Current Status in Railway:**
- NODE_ENV: ✅ production
- APP_URL: ✅ Configured
- ALLOWED_ORIGINS: ✅ Configured

---

## Backend Health Checks

### Check AI Provider Status

**Endpoint:** `GET /api/ai/status`

Returns:
```json
{
  "providers": {
    "local": { "enabled": true, "url": "http://ollama:11434" },
    "openai": { "enabled": false },
    "huggingface": { "enabled": false }
  }
}
```

**If all false:** AI features will fail with 503 errors

### Check Service Health

**Endpoint:** `GET /health`

Returns:
```json
{
  "status": "healthy|degraded",
  "database": "connected|disconnected",
  "redis": "connected|disconnected"
}
```

---

## Common Error Messages & Fixes

### "No AI provider available"

**Cause:** Neither Ollama nor HuggingFace is configured

**Fix:**
```bash
# Option A: Configure Ollama
LOCAL_AI_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=neural-chat

# Option B: Configure HuggingFace
HUGGINGFACE_API_TOKEN=hf_...
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.1
```

### "Stripe client not available"

**Cause:** STRIPE_SECRET_KEY not configured

**Fix:**
```bash
STRIPE_SECRET_KEY=sk_live_... # Get from Stripe Dashboard → API Keys
```

### "Document upload failed (503)"

**Cause:** S3 unreachable or Railway storage misconfigured

**Fix:**
```bash
# Test AWS S3 credentials
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...

# Or use local fallback
# Ensure /uploads directory exists and is writable
```

### "Subscription not updating after payment"

**Cause:** STRIPE_WEBHOOK_SECRET not set or webhook not called

**Fix:**
1. Get webhook secret from Stripe Dashboard → Webhooks
2. Add to Railway:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Configure webhook endpoint in Stripe:
   - Go to Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://your-railway-domain/webhooks/webhook`
   - Events: `payment_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated`, etc.

### "Consultations endpoint returns 404"

**Cause:** No lawyers in database OR auth token invalid

**Fix:**
1. Seed lawyer data:
   ```sql
   INSERT INTO users (id, email, role, first_name, last_name) 
   VALUES (gen_random_uuid(), 'lawyer@example.com', 'lawyer', 'John', 'Doe');
   ```

2. Verify auth token validity in request headers

---

## Startup Verification Checklist

When Railway deploys, check logs for:

```
[startup] ✅ Database connected successfully
[startup] ✅ Local AI provider reachable: http://ollama:11434
[startup] ✅ Stripe client initialized
[startup] ❌ CRITICAL: No AI provider configured!
[startup] ❌ HuggingFace not available
```

**If you see ANY RED X:** That feature will not work.

---

## Testing Each Feature

### 1. Test AI Chat

```bash
curl -X POST https://your-domain/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What visa should I apply for?"}'
```

**Expected:** 200 with text response
**If 503:** AI provider not configured
**If 500:** AI provider failed (check logs)

### 2. Test Translation

```bash
curl -X POST https://your-domain/api/ai/translate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fromLang":"en","toLang":"fr","text":"Hello world"}'
```

**Expected:** 200 with translated text
**If 503:** AI provider not configured

### 3. Test Document Upload

```bash
curl -X POST https://your-domain/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

**Expected:** 201 with document ID
**If 403:** Over quota for tier
**If 500:** S3 error (check AWS credentials)
**If 503:** Storage unavailable (will use local fallback)

### 4. Test Subscription Upgrade

```bash
curl -X POST https://your-domain/api/subscription/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"pro"}'
```

**Expected:** 200 with Stripe checkout URL
**If 400:** Invalid plan
**If 500:** Stripe error

### 5. Test Consultations

```bash
curl https://your-domain/api/consultations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** 200 with [] (empty if no consultations)
**If 404:** Route not registered
**If 401:** Auth token invalid
**If 500:** Database error

---

## Critical Missing Configurations Summary

| Feature | Status | Impact | Fix |
|---------|--------|--------|-----|
| **AI Services** | ❌ Ollama not verified | Chat/Translate fails | Verify LOCAL_AI_URL + Add HF fallback |
| **Stripe Payments** | ⚠️ Keys missing | Can't checkout | Add STRIPE_PRO/PREMIUM_PRICE_IDs + WEBHOOK_SECRET |
| **Document Upload** | ⚠️ S3 untested | Upload fails | Test AWS credentials or use local /uploads |
| **Email Notifications** | ❌ Not configured | No confirmations | Configure SMTP_HOST + credentials |
| **Lawyer Data** | ❌ Unknown | Consultations empty | Seed database with lawyers |

---

## Next Steps

1. **Add HuggingFace credentials** as AI provider backup
2. **Get Stripe price IDs** from Stripe dashboard and add to Railway variables
3. **Configure Stripe webhook** to `POST /webhooks/webhook`
4. **Test each API endpoint** from Testing section above
5. **Monitor logs** after redeployment for startup errors
6. **Verify database seed** has lawyer records

---

## Production Deployment Checklist

- [ ] LOCAL_AI_URL points to working Ollama instance
- [ ] HUGGINGFACE_API_TOKEN configured as fallback
- [ ] STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET set
- [ ] STRIPE_PRO_PRICE_ID + STRIPE_PREMIUM_PRICE_ID obtained from Stripe
- [ ] AWS S3 credentials verified (or local /uploads writable)
- [ ] SMTP configured for email notifications
- [ ] DATABASE_URL tested and migrations run
- [ ] REDIS_URL verified for caching/jobs
- [ ] /health endpoint returns "healthy"
- [ ] /api/ai/status shows at least one provider enabled
- [ ] Test flow: Chat → Upload → Consultation → Subscribe (in that order)

