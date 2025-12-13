# IMMEDIATE ACTION CHECKLIST - Get Everything Working in 30 Minutes

## Quick Overview

All code is written and working. You just need to configure 3 external services. This checklist will get you from "broken" to "fully functional" in about 30 minutes.

---

## ✓ STEP 1: Add Missing Stripe Variables (5 minutes)

### What to Do

1. Go to **Stripe Dashboard** → **Products**
2. Find your "Pro" plan → Click it → Copy **Price ID**
3. Find your "Premium" plan → Click it → Copy **Price ID**
4. Go to **Stripe Dashboard** → **Webhooks** → Find endpoint → Copy **Signing Secret**

### Add to Railway

Go to **Railway** → **Your Project** → **Settings** → **Variables**

Add these exact variables:
```
STRIPE_PRO_PRICE_ID = <paste pro price ID>
STRIPE_PREMIUM_PRICE_ID = <paste premium price ID>
STRIPE_WEBHOOK_SECRET = <paste signing secret>
```

**Save and redeploy.**

### Verify
```bash
curl https://your-domain/api/subscription/plans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should return list of plans.

---

## ✓ STEP 2: Configure AI Fallback (5 minutes)

### What to Do

1. Go to **HuggingFace.co** → Create account if needed
2. Go to **Settings** → **Access Tokens** → Create new token
3. Copy the token

### Add to Railway

Go to **Railway** → **Your Project** → **Settings** → **Variables**

Add:
```
HUGGINGFACE_API_TOKEN = hf_<paste your token>
HF_MODEL = mistralai/Mistral-7B-Instruct-v0.1
```

**Save and redeploy.**

### Verify
```bash
curl https://your-domain/api/ai/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should show HuggingFace as available.

---

## ✓ STEP 3: Seed Lawyer Data (2 minutes)

### What to Do

1. Get your database connection string from Railway
2. Connect to database using any SQL tool (psql, DBeaver, etc.)
3. Run this SQL:

```sql
INSERT INTO users (
  id, email, first_name, last_name, role, created_at, updated_at, metadata
) VALUES 
  (gen_random_uuid(), 'sarah.chen@law.com', 'Sarah', 'Chen', 'lawyer', NOW(), NOW(), '{"specialization":"Immigration","experience":8}'),
  (gen_random_uuid(), 'james.williams@law.com', 'James', 'Williams', 'lawyer', NOW(), NOW(), '{"specialization":"Visa","experience":12}'),
  (gen_random_uuid(), 'maria.garcia@law.com', 'Maria', 'Garcia', 'lawyer', NOW(), NOW(), '{"specialization":"Appeals","experience":6}'),
  (gen_random_uuid(), 'robert.singh@law.com', 'Robert', 'Singh', 'lawyer', NOW(), NOW(), '{"specialization":"Employment","experience":10}');
```

### Verify
```bash
curl https://your-domain/api/consultations/available/lawyers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should return 4 lawyers.

---

## ✓ STEP 4: Test Everything (5 minutes)

### Download Test Script

The test script is already in your repo. Run it:

```bash
# Make script executable
chmod +x test-backend.sh

# Run tests
API_URL=https://your-railway-domain TOKEN=your_jwt_token bash test-backend.sh
```

### Expected Output

```
✓ PASS: Health check
✓ PASS: AI status
✓ PASS: AI chat response
✓ PASS: Text translation
✓ PASS: Subscription plans
✓ PASS: Available lawyers
✓ PASS: Document upload
✗ FAIL: Email notification (expected if SMTP not configured)

========================================
Tests Summary:
✓ Passed: 7/8
✗ Failed: 1/8
⚠ Warned: 0/8
========================================
```

### What Each Test Does

| Test | What It Checks |
|------|---|
| Health Check | Server is running |
| AI Status | AI providers configured |
| AI Chat | Can get AI responses |
| Translation | Language translation works |
| Subscription Plans | Can fetch plan list |
| Available Lawyers | Lawyers in database |
| Document Upload | Can upload files |
| Email | SMTP configured (optional) |

---

## ✓ STEP 5: Verify Each Feature in UI (8 minutes)

### Test AI Chat

1. Open app → Go to "Chat" or messaging section
2. Type: "What visa should I apply for?"
3. Should get AI response in 3-5 seconds

**If fails:** Check Railway logs for "No AI provider available"

### Test Subscription

1. Open app → Go to "Settings" → "Plans"
2. Click "Upgrade to Pro"
3. Should redirect to Stripe checkout

**If fails:** Check that STRIPE_PRO_PRICE_ID and STRIPE_WEBHOOK_SECRET are set

### Test Consultations

1. Open app → Go to "Consultations"
2. Should see list of lawyers
3. Click "Book Consultation"

**If shows no lawyers:** Run the SQL seed script from Step 3

### Test Document Upload

1. Open app → Go to "Documents" or "Upload"
2. Select a file → Click upload
3. Should complete in 2-5 seconds

**If fails:** Check Railway logs for S3 errors - may be using local fallback which is fine

### Test Messages/Chat

1. Open app → Send a message (if multi-user app)
2. Should appear in other user's inbox in real-time

**If fails:** Check WebSocket connection - Socket.IO should be working

---

## ✓ STEP 6: Check Logs (2 minutes)

Go to **Railway** → **Your Project** → **Deployments** → Latest → **Logs**

Look for:
- ✅ "Local AI provider reachable" OR "HuggingFace configured"
- ✅ "Database connected"
- ✅ "Redis connected"
- ✅ "Server running on port 3000"

**Do NOT see:**
- ❌ "CRITICAL: No AI provider configured"
- ❌ "STRIPE_WEBHOOK_SECRET missing"
- ❌ "Database connection failed"

If you see critical errors, check that all variables from Steps 1-2 are set.

---

## ✓ STEP 7: Monitor Webhook (2 minutes)

Go to **Stripe Dashboard** → **Webhooks**

You should see your endpoint receiving events:
- `payment_intent.succeeded` - When user completes payment
- `customer.subscription.created` - When subscription starts
- `customer.subscription.updated` - When subscription changes tier

Each event should show a green checkmark (✅).

If events show ❌:
1. Check Railway logs for webhook processing errors
2. Make sure STRIPE_WEBHOOK_SECRET matches in Stripe dashboard AND Railway variables
3. Ensure webhook URL in Stripe matches your Railway domain

---

## Troubleshooting Quick Reference

| Problem | Check |
|---------|-------|
| AI chat returns 503 | Is LOCAL_AI_URL running? Is HUGGINGFACE_API_TOKEN set? |
| Can't upgrade plan | Is STRIPE_PRO_PRICE_ID set? |
| Subscription not updating | Is STRIPE_WEBHOOK_SECRET set? Are webhooks delivering? |
| No lawyers showing | Did you run the SQL seed script? |
| Document upload fails | Check S3 or /uploads directory |
| Messages not real-time | Check WebSocket connection in browser console |
| Emails not sending | SMTP_HOST not configured (optional) |

---

## Optional: Email Configuration (5 minutes)

If you want email notifications:

1. Get SMTP credentials from your email provider (Gmail, SendGrid, etc.)
2. Add to Railway Variables:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = your-email@gmail.com
   SMTP_PASS = your-app-password
   ```
3. Redeploy

---

## Optional: Custom Domain

If using custom domain:

1. Update `APP_URL` in Railway variables to match domain
2. Update `ALLOWED_ORIGINS` to include frontend domain
3. Ensure Stripe webhook URL uses correct domain

---

## Summary: Before vs. After

### BEFORE
- AI chat returns fake "Please provide more details" response ❌
- Upgrade button tries to checkout but has no price IDs ❌
- Consultations page shows "No lawyers available" ❌
- Messages work but fail silently sometimes ❌

### AFTER
- AI chat returns real responses from HuggingFace or Ollama ✅
- Upgrade button opens Stripe checkout successfully ✅
- Consultations shows list of available lawyers ✅
- Messages work reliably with proper error handling ✅

---

## Time Estimate

| Step | Time | Status |
|------|------|--------|
| 1. Stripe config | 5 min | ⏳ DO THIS NOW |
| 2. HuggingFace config | 5 min | ⏳ DO THIS NOW |
| 3. Seed lawyers | 2 min | ⏳ DO THIS NOW |
| 4. Run tests | 5 min | ⏳ DO THIS NOW |
| 5. Test in UI | 8 min | ⏳ DO THIS AFTER |
| 6. Check logs | 2 min | ⏳ DO THIS AFTER |
| 7. Monitor webhooks | 2 min | ⏳ DO THIS AFTER |

**Total: ~30 minutes**

---

## Questions?

- Check `BACKEND_SETUP_CRITICAL.md` for detailed explanations
- Run `test-backend.sh` to identify exactly which service is broken
- Check Railway logs for error messages
- See `API_DOCUMENTATION.md` for API endpoint details

---

**Remember:** All code is written and working. You're just configuring external services. It's not complicated - just follow the steps above.

Good luck! 🚀
