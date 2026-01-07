# Complete Deployment Automation Guide

## Overview
This guide will walk you through ALL fixes needed to deploy the ImmigrationAI app to Railway with all services functioning properly.

**Total Time**: 45-60 minutes (mostly waiting for services to initialize)

---

## ✅ Code Verification (DONE)

The application code is already properly configured for:
- ✅ WebSocket with Railway proxy support
- ✅ Redis integration with fallback support
- ✅ Ollama AI integration
- ✅ CORS and security headers
- ✅ Health check endpoints
- ✅ All API routes registered

**Status**: Code is ready. Only Railway configuration needed.

---

## PHASE 1: Set Critical Environment Variables (5 minutes)

### Step 1.1: Open Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Click your project
3. Click "App" service (the one showing errors)

### Step 1.2: Add These Variables

Click on "Variables" tab, then add each variable below:

**Critical (Must Add)**:
```
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app
NODE_ENV=production
APP_URL=https://immigrationai-app-production-b994.up.railway.app
```

**Authentication (Generate secure values)**:
```
JWT_SECRET=GenerateRandomString32CharsMinimum1234567890
REFRESH_SECRET=GenerateRandomString32CharsMinimum0987654321
```

**Stripe (Copy existing keys)**:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

**Other Core Variables**:
```
PORT=5000
LOG_LEVEL=debug
```

### Step 1.3: Redeploy
1. Click "Deploy" button (top right)
2. Wait for green checkmark (~2 minutes)
3. Check logs for errors

**Expected Logs**:
```
✅ Database connected successfully
✅ Server listening on port 5000
```

---

## PHASE 2: Add Redis Service (5 minutes)

### Step 2.1: Add Redis
1. In Railway Dashboard, click "+ Add Service"
2. Choose "Redis"
3. Accept default settings
4. Click "Add Plugin"

### Step 2.2: Railway Auto-Configures
- Redis service will start (takes 1-2 minutes)
- `REDIS_URL` will be automatically added to App service
- **Do NOT manually set REDIS_URL** - Railway does it

### Step 2.3: Redeploy App
1. Click on "App" service
2. Click "Deploy" button
3. Wait for green checkmark
4. Check logs

**Expected Logs**:
```
✅ Redis connected to redis://...
✅ Email queue initialized
```

**If NOT seeing these logs**:
- Check Variables tab - should have `REDIS_URL` present
- Restart App service (click three dots, choose "Restart")
- Wait 2 minutes and redeploy

---

## PHASE 3: Add Ollama AI Service (20-30 minutes)

### Step 3.1: Add Ollama Service
1. Click "+ Add Service"
2. Choose "Docker Image"
3. In "Image Name" field, type exactly:
   ```
   ollama/ollama:latest
   ```
4. Click "Deploy"
5. Wait for service to start (takes 1-2 minutes)

### Step 3.2: Configure Ollama Memory
1. Click on the "ollama" service you just created
2. Click "Settings" tab
3. Find "Memory" section
4. **Set to 8 GB** (critical for AI model)
5. Save changes

### Step 3.3: Add Ollama Volume
1. Still in "ollama" service settings
2. Find "Volumes" section
3. Click "+ Add"
4. Set:
   - Mount Path: `/root/.ollama`
   - (Size will be auto-determined)
5. Save

### Step 3.4: Update App Environment Variables
1. Click on "App" service
2. Go to "Variables" tab
3. Add these two new variables:
   ```
   LOCAL_AI_URL=http://ollama:11434/api/generate
   OLLAMA_MODEL=mistral
   ```
4. Save variables

### Step 3.5: Redeploy App
1. Click "Deploy" button on App service
2. **Wait 20-30 minutes** ⏳
   - Ollama is pulling the 4GB mistral model
   - First time takes longest
   - Don't panic if it seems stuck
   - Check Ollama service logs to see progress

**Expected Logs in Ollama**:
```
pulling manifest
pulling layers
...
success
```

**Expected Logs in App**:
```
🤖 Ollama initialized
✅ Model loaded: mistral
```

---

## PHASE 4: Fix Document Upload (if needed)

### Step 4.1: Check if Upload Works
1. Log in to your app
2. Try uploading a document
3. If it works → Skip to Phase 5 ✅
4. If 500 error → Continue below

### Step 4.2: Check Server Logs
1. Go to App service
2. Click "Logs" tab
3. Search for "upload" or "500"
4. Find the exact error message

### Step 4.3: Fix Based on Error

**Error: "ENOSPC" (No space)**
- App is out of disk space
- Add S3 integration or increase storage
- Contact Railway support for urgent increase

**Error: "Route not found"**
- Verify [server/routes.ts](server/routes.ts) has:
  ```typescript
  import documentRoutes from "./routes/documents";
  app.use("/api/documents", documentRoutes);
  ```

**Error: "File too large"**
- Increase limit in [server/index.ts](server/index.ts):
  ```typescript
  app.use(express.json({ limit: '100mb' }));
  ```

---

## PHASE 5: Verification Tests (5 minutes)

### Test 5.1: Health Check
Open in browser:
```
https://immigrationai-app-production-b994.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### Test 5.2: WebSocket Connection
1. Log in to app
2. Open Developer Tools (F12)
3. Go to "Console" tab
4. Should NOT see red error messages
5. Should see smooth operation

**Check Network Tab**:
1. Go to "Network" tab
2. Look for `socket.io` requests
3. Should see requests succeed (not red)
4. Should see both WebSocket and polling options

### Test 5.3: Authentication
1. Log in successfully
2. Open DevTools → Console
3. Check tokens exist:
   ```javascript
   localStorage.getItem('accessToken')  // Should show token
   localStorage.getItem('refreshToken') // Should show token
   ```

### Test 5.4: Consultations Endpoint
1. Log in
2. In DevTools Console, run:
   ```javascript
   fetch('/api/consultations', {
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```
3. Should return array (not 404)

### Test 5.5: AI Features
1. Upload a document or ask for AI analysis
2. Should get response (not "Service unavailable")
3. Should take 10-60 seconds first time (model initializing)

### Test 5.6: Document Upload
1. Try uploading a test document
2. Should return success (not 500)
3. Should appear in document list

**All tests pass?** ✅ **Your app is production-ready!**

---

## Troubleshooting During Phases

### Problem: App won't start after Phase 1
**Solution**:
1. Check if DATABASE_URL exists (should auto-set)
2. Restart app service
3. Wait 3 minutes
4. Redeploy

### Problem: Redis still shows "disabled" after Phase 2
**Solution**:
1. Verify REDIS_URL exists in Variables
2. Check Redis service is running (green status)
3. Hard restart App:
   - Click three dots on App service
   - Click "Restart"
   - Wait 2 minutes
   - Redeploy

### Problem: Ollama service won't start
**Solution**:
1. Check it's assigned 8GB memory
2. Restart Ollama service
3. Wait 5 minutes for it to pull model
4. Check logs in Ollama service

### Problem: Still getting errors after all phases
**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Log out completely
4. Log back in
5. Try feature again

---

## Complete Environment Variables Reference

Copy and paste this entire block into Railway Variables (replace values where marked):

```
# Core Configuration
NODE_ENV=production
PORT=5000
LOG_LEVEL=debug

# URLs
APP_URL=https://immigrationai-app-production-b994.up.railway.app
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app

# Authentication (GENERATE NEW SECURE VALUES)
JWT_SECRET=YourVeryLongSecureRandomString32CharsMinimum___
REFRESH_SECRET=AnotherVeryLongSecureRandomString32CharsMinimum___

# Database (AUTO-SET BY RAILWAY - DO NOT CHANGE)
# DATABASE_URL=postgresql://... (Railway sets this automatically)

# Redis (AUTO-SET BY RAILWAY AFTER ADDING REDIS SERVICE)
# REDIS_URL=redis://... (Railway sets this automatically after Phase 2)

# Ollama AI (SET AFTER PHASE 3)
LOCAL_AI_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=mistral

# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

---

## Success Checklist

After completing all phases:

- [ ] Phase 1: Variables set, app redeployed
- [ ] Phase 2: Redis service running, app redeployed
- [ ] Phase 3: Ollama service running with 8GB memory, app redeployed
- [ ] Phase 4: No upload errors OR upload working
- [ ] Test 5.1: Health check returns "healthy"
- [ ] Test 5.2: No WebSocket errors in console
- [ ] Test 5.3: Tokens exist in localStorage
- [ ] Test 5.4: /api/consultations returns data
- [ ] Test 5.5: AI features work
- [ ] Test 5.6: Document upload succeeds

**All checked?** ✅ Your platform is production-ready!

---

## Service Status Expected

After completion:

| Service | Status | Port | Memory |
|---------|--------|------|--------|
| App | ✅ Running | 5000 | 1GB |
| PostgreSQL | ✅ Running | 5432 | Auto |
| Redis | ✅ Running | 6379 | 256MB |
| Ollama | ✅ Running | 11434 | 8GB |

---

## Cost Estimate (Monthly)

- App (1GB): ~$5
- PostgreSQL (500MB free): $0
- Redis (256MB): ~$5
- Ollama (6GB RAM): ~$15
- **Total**: ~$25/month

---

## Next Steps After Deployment

1. **Monitor Logs** - Watch for errors in first 24 hours
2. **User Testing** - Have beta users test all features
3. **Email Configuration** - Set up SMTP for notifications
4. **Custom Domain** - Point your domain to Railway URL
5. **Backup Strategy** - Set up automated database backups
6. **Performance Tuning** - Optimize based on usage patterns

---

## Support Resources

- Railway Docs: https://docs.railway.app
- Node.js Deployment: https://docs.railway.app/guides/nodejs
- PostgreSQL Troubleshooting: https://docs.railway.app/databases/postgresql
- Socket.IO in Production: https://socket.io/docs/v4/
- Ollama Documentation: https://ollama.ai

---

## Quick Reference Commands (for terminal/ssh if needed)

```bash
# Test API health
curl https://immigrationai-app-production-b994.up.railway.app/health

# Test WebSocket (requires auth token)
wscat -c "ws://localhost:5000/socket.io/?transport=websocket"

# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Test Redis connectivity
redis-cli -u $REDIS_URL PING
```

---

## Estimated Timeline

| Phase | Duration | What Happens |
|-------|----------|--------------|
| 1 | 5 min | Variables set, app deploys |
| 2 | 5 min | Redis service starts, app deploys |
| 3 | 20-30 min | Ollama pulls model, app deploys |
| 4 | Variable | Fix upload if needed |
| 5 | 5 min | Run verification tests |
| **Total** | **40-50 min** | **Platform Ready** |

**YOU'RE ALL SET TO DEPLOY!**

Start with Phase 1 now. Each phase takes just 5 minutes of actual work - the rest is automated waiting. Come back when you need help with any phase.
