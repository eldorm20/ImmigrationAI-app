# Troubleshooting Guide - ImmigrationAI Platform

## Quick Status Check

### 1. WebSocket Connection Failed
**Error**: `WebSocket connection failed: WebSocket is closed before the connection is established`

**Root Cause**: Socket.IO cannot establish WebSocket connection to Railway

**Solutions**:
- ✅ Socket.IO is configured with both WebSocket and polling transports
- ✅ CORS is properly configured
- Check in Browser DevTools → Network:
  - Should see requests to `/socket.io/?EIO=...`
  - At least one of these should succeed (WebSocket or long-polling)

**If still failing**:
1. Check `ALLOWED_ORIGINS` environment variable in Railway
2. Verify it matches your app URL exactly
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+Shift+R)

---

## 2. Socket.IO Polling 400 Error
**Error**: `Failed to load resource: the server responded with a status of 400` on polling requests

**Root Cause**: Missing or mismatched `ALLOWED_ORIGINS` environment variable

**Solution**:
1. In Railway Dashboard → App Service → Variables
2. Set `ALLOWED_ORIGINS` to your production URL:
   ```
   ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app
   ```
3. Redeploy the app

**Alternative**: If you need multiple origins:
```
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app,https://yourdomainname.com
```

---

## 3. `/api/consultations` Returns 404 Error
**Error**: `Failed to load resource: the server responded with a status of 404` when accessing `/api/consultations`

**Root Cause**: The endpoint requires authentication. User is not logged in OR auth token not being sent

**Solutions**:

### A. Ensure User is Logged In
1. Check browser console (F12 → Console tab)
2. Look for error messages about authentication
3. If redirected to login page, user needs to log in first
4. After login, refresh and try again

### B. Check Token is Being Sent
1. Open DevTools → Network tab
2. Click on `/api/consultations` request
3. Look at Request Headers
4. Should have: `Authorization: Bearer eyJhbG...`
5. If missing, auth middleware is not finding the token

### C. Token Storage Issues
```javascript
// In browser console, check if token exists:
localStorage.getItem('accessToken')  // Should return a token string
localStorage.getItem('refreshToken') // Should exist
```

If tokens are missing:
1. Log out completely
2. Clear local storage: `localStorage.clear()`
3. Hard refresh: Ctrl+Shift+R
4. Log back in
5. Verify tokens are stored

### D. CORS Issues with Credentials
If tokens are sent but request fails:
1. Check that request includes credentials:
   ```javascript
   fetch('/api/consultations', {
     credentials: 'include'  // REQUIRED
   })
   ```
2. Server CORS must allow this

---

## 4. Ollama AI Not Connected
**Error**: In logs: `Local AI provider failed, falling back`

**Root Cause**: 
- Ollama service not added to Railway OR
- `LOCAL_AI_URL` environment variable not set OR
- Ollama service is still pulling the model (can take 5-30 min on first run)

**Solutions**:

### Option A: Add Ollama Service (Recommended for Production)
1. In Railway Dashboard → "+ Add Service" → Docker Image
2. Image: `ollama/ollama:latest`
3. Set in App service environment variables:
   ```
   LOCAL_AI_URL=http://ollama:11434/api/generate
   OLLAMA_MODEL=mistral
   ```
4. In Ollama service:
   - Memory: 6-8 GB
   - Volume: `/root/.ollama` (mount to persist models)
5. Redeploy app
6. Wait 5-30 minutes for model to pull

### Option B: Use External Ollama Server
1. Set `LOCAL_AI_URL=https://your-ollama-server.com/api/generate`
2. Ensure Ollama is publicly accessible (has proper auth/firewall rules)

### Option C: Disable Ollama (Testing Only)
```typescript
// In server/lib/ai.ts - comment out Ollama initialization
// export const aiProvider = 'ollama';
export const aiProvider = 'fallback'; // Just return canned responses
```

### Verify Ollama is Working
```bash
# SSH into Ollama container and run:
curl http://localhost:11434/api/generate -X POST \
  -d '{"model":"mistral","prompt":"Hello"}'
```

---

## 5. Redis Not Connected
**Error**: `No REDIS_URL configured; Redis client disabled`

**Root Cause**: Redis service not added to Railway

**Solutions**:

### Add Redis Service
1. Railway Dashboard → "+ Add Service" → Redis
2. This auto-sets `REDIS_URL` in app
3. Redeploy app
4. Verify in logs: `Redis connected ✅`

### Verify Redis Working
```bash
# From app logs, should see:
"Redis connected to redis://..."
"Email queue initialized"
```

---

## 6. Upload/Document API Returns 500 Error
**Error**: `Failed to upload document: Error (HTTP 500)`

**Root Cause**: Server error in `/api/documents/upload`

**Solutions**:

### Check Server Logs
1. Railway Dashboard → App Service → Logs
2. Search for `500` or `error`
3. Look for specific error message about upload

### Common Causes:
1. **No S3 configured** - If app tries to upload to S3
   - Solution: Configure S3 variables OR switch to local upload
   
2. **Disk space full** - If using local uploads
   - Solution: Add more storage in Railway OR use S3
   
3. **Missing upload route** - Route not registered
   - Solution: Check `server/routes.ts` has document routes

4. **File size too large**
   - Solution: Check max file size limit
   - Usually: request body parser limit in `server/index.ts`

### Check Upload Route is Registered
```typescript
// In server/routes.ts should have:
import documentRoutes from "./routes/documents";
app.use("/api/documents", documentRoutes);
```

### Fix Upload Middleware
```typescript
// In server/index.ts ensure:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
```

---

## 7. Failed to Queue Notification Error
**Error**: `Failed to queue notification: Error`

**Root Cause**: Redis/Queue not configured

**Solution**: Follow "Redis Not Connected" section above

---

## Complete Railway Setup Checklist

### Services
- [ ] PostgreSQL (auto-added)
- [ ] Redis (must add)
- [ ] Ollama (optional but recommended)

### Environment Variables (in App Service)
- [ ] `DATABASE_URL` (auto-set by PostgreSQL)
- [ ] `REDIS_URL` (auto-set by Redis)
- [ ] `LOCAL_AI_URL=http://ollama:11434/api/generate`
- [ ] `OLLAMA_MODEL=mistral`
- [ ] `ALLOWED_ORIGINS=https://your-app-url.railway.app`
- [ ] `APP_URL=https://your-app-url.railway.app`
- [ ] `JWT_SECRET=your-secret-here`
- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `STRIPE_PUBLIC_KEY=pk_test_...`
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`

### Verification
- [ ] App Service Status: Running ✅
- [ ] PostgreSQL Status: Running ✅
- [ ] Redis Status: Running ✅
- [ ] Ollama Status: Running ✅
- [ ] Browser shows no WebSocket errors
- [ ] Login works without errors
- [ ] Can access /api/consultations after login
- [ ] AI responses work (Ollama loaded)

---

## Testing Commands

### Test API Health
```bash
curl https://your-app-url.railway.app/health
# Should return: {"status":"healthy",...}
```

### Test WebSocket Connection
```javascript
// In browser console:
const socket = io('https://your-app-url.railway.app', {
  auth: { token: localStorage.getItem('accessToken') }
});
socket.on('connect', () => console.log('Connected!'));
socket.on('error', (err) => console.log('Error:', err));
```

### Test Consultations API
```bash
# After logging in, get your token from localStorage
TOKEN=$(some_way_to_get_token)

curl -H "Authorization: Bearer $TOKEN" \
  https://your-app-url.railway.app/api/consultations
```

---

## Common Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| WebSocket fails | Set `ALLOWED_ORIGINS` in Railway |
| 404 on consultations | Log in first, check auth token |
| Ollama not working | Add Ollama service, set `LOCAL_AI_URL` |
| Redis errors | Add Redis service in Railway |
| Upload fails | Check disk space, add S3 config, increase body limit |
| Page won't load | Clear cache (Ctrl+Shift+Delete), hard refresh (Ctrl+Shift+R) |

---

## Still Having Issues?

1. **Check Railway Logs** (App Service → Logs)
   - Look for specific error messages
   - Copy exact error and search in this guide

2. **Check Browser Console** (F12 → Console)
   - Check for JavaScript errors
   - Check for failed network requests

3. **Check Network Tab** (F12 → Network)
   - Look at failed requests
   - Check request headers/response

4. **Check Local Development**
   - Run locally to isolate Railway issues
   - `npm run dev` then test same feature

5. **Restart Services**
   - Railway → App Service → Restart
   - Wait 2-3 minutes for full restart
   - Try again

6. **Redeploy**
   - Make a small code change
   - Push to GitHub
   - Railway auto-redeploys
   - Or click "Deploy" in Railway dashboard
