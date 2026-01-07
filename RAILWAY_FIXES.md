# Railway Configuration Fixes

## Issues Found & Fixed

### 1. **WebSocket Connection Failure**
**Issue**: `WebSocket connection failed: WebSocket is closed before the connection is established`

**Cause**: Socket.IO wasn't configured for Railway's reverse proxy

**Fix Applied**: Updated `server/lib/socket.ts` to include:
- Both WebSocket and polling transports
- Proper CORS configuration
- Railway proxy timeout settings

### 2. **Socket.IO Polling 400 Error**  
**Issue**: `Failed to load resource: the server responded with a status of 400`

**Cause**: Missing or misconfigured ALLOWED_ORIGINS environment variable

**Fix**: Ensure Railway has these variables set:
```
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app
APP_URL=https://immigrationai-app-production-b994.up.railway.app
```

### 3. **Missing Redis Configuration**
**Issue**: `No REDIS_URL configured; Redis client disabled`

**Cause**: Redis service not connected to app in Railway

**Fix**: 
1. In Railway Dashboard, add Redis service
2. Set `REDIS_URL` environment variable in App service
3. Redeploy

### 4. **Local AI Provider Failed (Ollama)**
**Issue**: `Local AI provider failed, falling back`

**Cause**: `LOCAL_AI_URL` not set or Ollama service not running

**Fix**:
1. In Railway, add Ollama service with `ollama/ollama:latest` image
2. Set `LOCAL_AI_URL=http://ollama:11434/api/generate`
3. Set `OLLAMA_MODEL=mistral`
4. Allocate 4-8GB RAM to Ollama service
5. Redeploy

### 5. **`/api/consultations` 404 Error**
**Issue**: `Failed to load resource: the server responded with a status of 404`

**Cause**: Either route not registered or user not authenticated

**Fix**: 
- Consultations route requires authentication
- User must be logged in to access `/api/consultations`
- Check browser console for auth errors

## Railway Environment Variables to Set

Add ALL of these in Railway → App Service → Variables:

```
# Core
NODE_ENV=production
PORT=5000
APP_URL=https://immigrationai-app-production-b994.up.railway.app
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app,https://immigrationai.com

# Database (auto-set by Railway)
DATABASE_URL=postgresql://...

# Redis (REQUIRED - must be added!)
REDIS_URL=redis://...

# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Ollama AI (REQUIRED)
LOCAL_AI_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=mistral

# Authentication
JWT_SECRET=your-strong-random-string-32-chars-minimum
REFRESH_SECRET=your-another-strong-random-string

# Email (optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@immigrationai.com

# S3 (optional - only if using file uploads)
S3_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Railway Service Configuration

### PostgreSQL
- Add via "+ Add Service" → PostgreSQL
- Auto-sets `DATABASE_URL`

### Redis
- Add via "+ Add Service" → Redis
- Auto-sets `REDIS_URL`
- Memory: 256 MB minimum

### Ollama
- Add via "+ Add Service" → Docker Image: `ollama/ollama:latest`
- **Memory: 4-8 GB** (critical for AI performance)
- **Volume: `/root/.ollama` (for model persistence)**
- **Port: 11434**

## Verification Steps

1. **Check WebSocket Connection**
   ```
   Open browser DevTools → Console
   Should NOT show WebSocket errors
   Should show "Connected" message
   ```

2. **Check Redis Connection**
   ```
   In logs should show: "Redis connected" or similar
   NOT: "Redis not connected"
   ```

3. **Check Ollama Connection**
   ```
   Logs should show:
   "Local AI provider initialized"
   "Ollama model loaded: mistral"
   NOT: "Local AI provider failed"
   ```

4. **Test API Endpoint**
   ```
   curl https://immigrationai-app-production-b994.up.railway.app/health
   Should return: {"status":"healthy",...}
   ```

5. **Test Authenticated Endpoint**
   ```
   Log in to the application first
   Then try /api/consultations
   Should return consultations list (not 404)
   ```

## Deployment Steps

1. **Add Missing Services** (if not already added)
   - PostgreSQL
   - Redis
   - Ollama

2. **Update Environment Variables**
   - Set all required variables listed above
   - Double-check STRIPE keys (sk_test_, pk_test_)
   - Verify REDIS_URL is set

3. **Redeploy App Service**
   - Click "Deploy"
   - Monitor logs for:
     - Database connection ✅
     - Redis connection ✅
     - Ollama initialization (5-30 min first time)

4. **Test in Browser**
   - Reload page
   - Check console for no errors
   - Log in
   - Test AI features

## Expected Logs After Fix

```
✅ PostgreSQL connection successful
✅ Redis connected
✅ Socket.IO initialized with WebSocket + Polling
🤖 Ollama initialized
📥 Pulling model 'mistral'...
✅ Model ready
✨ Server listening on port 5000
```

## If Issues Persist

1. **Clear Browser Cache** (Ctrl+Shift+Delete)
2. **Hard Refresh** (Ctrl+Shift+R)
3. **Check Railway Service Status** - all should be green
4. **Check Logs** for specific error messages
5. **Verify Environment Variables** - make sure no typos

## Cost Optimization

- **PostgreSQL**: 500MB = free, larger pay as you go
- **Redis**: 256MB = ~$5/month
- **Ollama**: 6GB RAM = ~$15/month
- **App**: 1GB RAM = ~$5/month
- **Total**: ~$25/month for full stack
