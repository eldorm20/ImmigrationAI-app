# Critical Issues - Resolution Steps

## Issue Summary from Screenshots/Logs

### 🔴 CRITICAL ISSUES

1. **WebSocket Connection Failed**
   - Status: ⚠️ Partially Fixed
   - Fix: Socket.IO configured with WebSocket + polling
   - Action: Verify `ALLOWED_ORIGINS` is set in Railway

2. **Socket.IO Polling 400 Error**
   - Status: ⚠️ Partially Fixed
   - Cause: ALLOWED_ORIGINS mismatch
   - Action: Set correct ALLOWED_ORIGINS in Railway

3. **Redis Not Connected**
   - Status: ❌ NOT FIXED - Blocks notifications/queue
   - Action: Add Redis service in Railway (critical!)

4. **Ollama AI Not Initializing**
   - Status: ❌ NOT FIXED - AI features won't work
   - Action: Add Ollama service + set LOCAL_AI_URL

5. **API 404 on `/api/consultations`**
   - Status: ℹ️ EXPECTED - Requires authentication
   - Action: Ensure user is logged in before accessing

6. **API 500 on Document Upload**
   - Status: ❌ NOT FIXED - Need to check server logs
   - Action: Review error logs, check upload configuration

---

## Step-by-Step Fix Plan

### PHASE 1: Railway Environment Variables (5 mins)
**In Railway Dashboard → App Service → Variables**

Set these critical variables:

```
# CORS/Origins - REQUIRED
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app

# Core Variables
NODE_ENV=production
PORT=5000
APP_URL=https://immigrationai-app-production-b994.up.railway.app

# Authentication
JWT_SECRET=generate-strong-random-32-char-string-here

# Stripe (existing keys)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

After setting, **Redeploy App** (takes 2-3 min)

**Verify**: 
- ✅ App deploys without errors
- ✅ No CORS/WebSocket errors in console

---

### PHASE 2: Add Redis Service (5 mins)
**Critical for notifications, caching, and queue system**

1. Railway Dashboard → Click "+ Add Service"
2. Choose "Redis"
3. Accept defaults (256MB is fine)
4. Click "Add Plugin"
5. Wait for Redis to start (1-2 min)
6. **App will auto-detect REDIS_URL**
7. Redeploy App

**Verify in Logs**:
```
✅ Redis connected to redis://...
✅ Email queue initialized
```

**If still disabled**:
- Check REDIS_URL is in variables
- Restart app service

---

### PHASE 3: Add Ollama Service (15-30 mins - First run pulls 4GB model)
**Critical for AI feature to work**

1. Railway Dashboard → Click "+ Add Service"
2. Choose "Docker Image"
3. Enter: `ollama/ollama:latest`
4. Click "Deploy"
5. Configure in Ollama service details:
   - Memory: 6-8 GB (critical!)
   - Volume: `/root/.ollama` (to persist model)
   - Name: `ollama`

6. Go to App service variables, add:
   ```
   LOCAL_AI_URL=http://ollama:11434/api/generate
   OLLAMA_MODEL=mistral
   ```

7. Redeploy App

**Wait for Model to Load**:
- Ollama logs will show pulling `mistral` model (2-10 GB)
- Take 5-30 minutes first time
- Once done, logs will show:
  ```
  ✅ Model ready
  🤖 Ollama initialized
  ```

**Verify**:
```javascript
// In browser after AI feature is used:
// Should NOT see "Local AI provider failed"
```

---

### PHASE 4: Fix Document Upload (if needed)
**Only if still getting 500 errors after Phase 1-3**

Check what's happening:

1. Open Railway → App Service → Logs
2. Scroll down for recent errors
3. Search for "upload" or "500"
4. Look for specific error message

**Common Solutions**:

**If error is "ENOSPC" (no space)**:
- Add storage to app or enable S3 in variables

**If error is "Route not found"**:
- Verify in [server/routes.ts](server/routes.ts):
  ```typescript
  import documentRoutes from "./routes/documents";
  app.use("/api/documents", documentRoutes);
  ```

**If error is "File too large"**:
- Increase limit in [server/index.ts](server/index.ts):
  ```typescript
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb' }));
  ```

---

## Verification Checklist

After all phases, verify each item:

### Frontend (Browser)
- [ ] Page loads without JavaScript errors (F12 → Console)
- [ ] No red X's in Network tab
- [ ] WebSocket connects (check for `socket.io` requests)
- [ ] Login works smoothly
- [ ] Can navigate to dashboard
- [ ] AI responses appear (not "service unavailable")
- [ ] Can upload documents (no 500 errors)

### Backend (Railway Logs)
- [ ] `✅ PostgreSQL connected`
- [ ] `✅ Redis connected`
- [ ] `✅ Ollama initialized`
- [ ] No red ERROR messages
- [ ] No CORS errors
- [ ] Requests logged successfully

### API Endpoints
- [ ] `GET /health` returns 200
- [ ] `GET /api/consultations` returns 200 (after login)
- [ ] `POST /api/documents/upload` returns 200
- [ ] `POST /api/consultations` creates request

---

## Expected Results After Fix

### ✅ What Should Work
1. **WebSocket**: Real-time messaging between users
2. **Notifications**: Email/in-app when events occur
3. **AI Features**: Instant document analysis with mistral model
4. **Consultations**: Booking and managing lawyer consultations
5. **Documents**: Uploading and processing immigration documents
6. **Stripe**: Payment processing for premium features

### ⏱️ Performance Expectations
- Page load: < 3 seconds
- WebSocket connection: < 2 seconds
- API requests: < 500ms
- Document analysis: 5-30 seconds (depends on document size)
- Ollama first response: 10-60 seconds (model needs to run)

---

## Troubleshooting if Issues Remain

### WebSocket Still Failing?
1. Check `ALLOWED_ORIGINS` matches your exact Railway URL
2. Check CORS headers in browser Network tab
3. Redeploy app after changing ALLOWED_ORIGINS
4. Clear browser cache (Ctrl+Shift+Delete)

### Redis Still Not Working?
1. Verify Redis service is running (green status in Railway)
2. Check REDIS_URL appears in App variables
3. Restart App service (hard restart, not just redeploy)
4. Check logs for "Redis" error messages

### Ollama Still Not Working?
1. Check Ollama service is running (green status)
2. Check memory allocation is 6GB+
3. Monitor Ollama logs - model might still be pulling
4. If stuck pulling > 30 min, may need to restart
5. Verify LOCAL_AI_URL is exactly: `http://ollama:11434/api/generate`

### Upload Still Failing?
1. Check [server/routes.ts](server/routes.ts) for document routes
2. Look at exact error in Railway logs
3. Try uploading smaller file first
4. Check disk space not full

---

## Final Deployment Verification

Run this sequence:

1. **Reset everything**:
   - Clear browser cache
   - Log out completely
   - Hard refresh (Ctrl+Shift+R)

2. **Full cycle test**:
   - Log in
   - Open DevTools (F12)
   - Check Console - should be silent (no errors)
   - Check Network - no failed requests
   - Try an AI feature - should work
   - Try uploading document - should succeed
   - Try booking consultation - should succeed

3. **Check logs**:
   - Railway App logs - should show smooth request flow
   - No 500 errors
   - No CORS rejections

4. **If everything passes** ✅:
   - Platform is production-ready
   - All critical systems operational
   - Ready for users

---

## Summary

| Phase | Time | Status | Action |
|-------|------|--------|--------|
| 1 | 5 min | SET_VARS | Add ALLOWED_ORIGINS, redeploy |
| 2 | 5 min | ADD_SERVICE | Add Redis, wait 2 min, redeploy |
| 3 | 20 min | ADD_SERVICE | Add Ollama, wait for model, redeploy |
| 4 | ? | CHECK_LOGS | Check upload errors if any |
| **Total** | **35 min** | **Ready** | **Production deployment complete** |

**Estimated time to full fix: 35-45 minutes** (mostly waiting for services to start)

Once completed, all major features will be operational:
- ✅ Real-time messaging
- ✅ AI document analysis  
- ✅ Email notifications
- ✅ Consultation booking
- ✅ Payment processing
- ✅ User authentication
