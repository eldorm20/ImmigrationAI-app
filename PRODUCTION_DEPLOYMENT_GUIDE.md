# Production Deployment Guide

## Current Status
All console errors have been diagnosed and fixed. The latest commit (`bb7efb6`) includes comprehensive improvements for production deployment.

## Summary of Fixes Applied

### 1. **404 /api/consultations - FIXED** ✅
**Issue**: Route returns 404 when accessed  
**Root Cause**: Redundant authentication middleware  
**Fix**: Removed duplicate `authenticate` middleware from individual route handlers
- Routes now rely on `router.use(authenticate)` at the module level
- This prevents double-authentication and routing issues
- **File**: `server/routes/consultations.ts` (lines 15, 129, 177)

### 2. **400 Socket.IO Polling - FIXED** ✅
**Issue**: `Failed to load resource: the server responded with a status of 400`  
**Root Cause**: CORS origin validation too strict; Railway proxies requests with different origin headers  
**Fixes**:
- Implemented function-based CORS origin validation instead of simple array matching
- Added support for origins without explicit protocol
- Wildcard pattern matching for dynamic subdomains
- Improved logging for debugging CORS rejections
- Added timeout tuning: `pingInterval: 25000`, `pingTimeout: 20000`, `upgradeTimeout: 10000`
- Always allow requests without origin (WebSocket handshakes)
- **File**: `server/lib/socket.ts` (lines 22-68)

### 3. **500 /api/documents/upload - FIXED** ✅
**Issue**: File upload fails with 500 error, even when S3 is not configured  
**Root Cause**: S3 client attempts to upload without checking if bucket is configured  
**Fix**: 
- Improved logic to detect when S3_BUCKET is not set
- Falls back to local filesystem (`/uploads` folder) immediately
- Better error messages for permission issues (EACCES)
- Added logging to clarify which storage mechanism is being used
- **File**: `server/lib/storage.ts` (lines 150-195)

### 4. **403 /api/ai/documents/generate - EXPECTED BEHAVIOR** ℹ️
**Issue**: Returns 403 when quota is exceeded  
**Root Cause**: This is intentional - quota enforcement via `incrementUsage()`  
**Solution**: 
- Check user's subscription tier in `/subscription` endpoint
- Upgrade plan to increase AI generation limits
- For testing: Contact support to manually increase quota
- **File**: `server/lib/aiUsage.ts` (lines 39-42)

## Environment Variables for Production

### **Critical (Must Be Set)**
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=<strong-random-key>
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Email
SENDGRID_API_KEY=sg_...

# Redis (for caching and job queue)
REDIS_URL=redis://...
```

### **Storage (Choose One)**
```env
# Option A: AWS S3 / Railway Storage
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-storage-endpoint.com
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1

# Option B: Local Filesystem (Default if S3 not configured)
# No env vars needed - files go to /uploads folder
# Make sure /uploads directory is writable!
```

### **AI Providers (Choose At Least One)**
```env
# Option A: Local Ollama (Recommended for Privacy)
LOCAL_AI_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Option B: Hugging Face
HUGGINGFACE_API_TOKEN=hf_xxx
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

### **Payments (Optional)**
```env
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### **Application**
```env
APP_URL=https://your-domain.com
NODE_ENV=production
PORT=5000
```

## Deployment Checklist

### Step 1: Verify Configuration
Call the diagnostic endpoint to check your setup:
```bash
curl https://your-domain.com/api/debug/errors
```

This will show:
- Missing environment variables
- Configured services status
- Specific issues to fix

### Step 2: Test Health Check
```bash
curl https://your-domain.com/health
```

Response should show:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected",
  "redis": "connected"
}
```

### Step 3: Verify Socket.IO Configuration
```bash
curl https://your-domain.com/api/debug/socket-config
```

Should show your allowed origins and transports.

### Step 4: Test Each Feature

#### Consultations Endpoint
```bash
curl -H "Authorization: Bearer <token>" \
  https://your-domain.com/api/consultations
```
Expected: `200 OK` with empty array or consultation list

#### Document Upload
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  https://your-domain.com/api/documents/upload
```
Expected: `200 OK` with document object (uses local storage if S3 not configured)

#### AI Generation
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"template":"Motivation Letter","data":{"name":"John"}}' \
  https://your-domain.com/api/ai/documents/generate
```
Expected: `200 OK` with generated document (or `503` if no AI provider)

#### Socket.IO Connection
Open browser console and check for WebSocket connection to:
```
wss://your-domain.com/socket.io/?transport=websocket
```
Should connect successfully without 400 errors.

## Common Issues & Solutions

### **404 Consultations Error**
✅ **FIXED in commit `bb7efb6`** - Remove redundant auth middleware

### **400 Socket.IO Errors**
✅ **FIXED in commit `bb7efb6`** - Improved CORS validation

### **500 Document Upload**
✅ **FIXED in commit `bb7efb6`** - Better S3/local fallback logic

**If still happening**:
1. Check `/api/debug/errors` for S3 configuration issues
2. Ensure `/uploads` directory exists and is writable: `mkdir -p /app/uploads && chmod 755 /app/uploads`
3. If using S3, verify credentials in `/api/debug/errors`

### **503 AI Service Unavailable**
**Solution**: Set either `LOCAL_AI_URL` + `OLLAMA_MODEL` or `HUGGINGFACE_API_TOKEN` + `HF_MODEL`

### **403 AI Quota Exceeded**
**Solution**: 
1. Check user's subscription tier: `GET /api/subscription`
2. Upgrade plan if needed
3. Or contact admin to increase quota manually

### **WebSocket Connection Fails**
**Checklist**:
1. Check `/api/debug/socket-config` - confirm your domain is in allowed origins
2. Ensure `ALLOWED_ORIGINS` includes your deployment domain
3. For Railway: Verify `APP_URL` is set to your Railway domain
4. Check browser console for CORS errors

## Performance Tuning

### Redis Configuration
If Redis is slow, check:
```env
REDIS_URL=redis://user:password@host:port?retryStrategy=exponential&maxRetriesPerRequest=null
```

### S3 Upload Retries
Current settings (3 attempts with 500ms, 1s, 2s delays) are optimized for most cases.  
If uploads timeout frequently, increase timeouts in `server/lib/storage.ts`:
```typescript
const RETRY_DELAYS = [1000, 2000, 4000]; // More patient retries
```

### Socket.IO Polling Fallback
If WebSocket keeps dropping, polling will kick in automatically with these settings:
```typescript
pingInterval: 25000,    // Send ping every 25 seconds
pingTimeout: 20000,     // Wait 20 seconds for pong
upgradeTimeout: 10000,  // Try to upgrade to WebSocket for 10 seconds
```

## Monitoring & Debugging

### Key Logs to Watch
1. **Authentication errors** - Check `Socket.IO client authenticated` in logs
2. **Storage errors** - Look for `S3 file upload failed` or `Local filesystem storage failed`
3. **AI provider errors** - Watch for `Local AI provider failed, falling back`

### Debug Endpoints (Production Safe)
These endpoints are safe to call in production and don't expose sensitive data:
- `GET /api/debug/errors` - Configuration issues summary
- `GET /api/debug/socket-config` - Socket.IO configuration
- `GET /api/health` - Service health check

### Health Monitoring Script
```bash
#!/bin/bash
# Monitor production health every 30 seconds
while true; do
  echo "$(date): Checking health..."
  curl -s https://your-domain.com/api/health | jq .
  sleep 30
done
```

## Recent Changes (Commit bb7efb6)

### Files Modified
1. **server/lib/socket.ts** - Enhanced CORS with function-based validation
2. **server/routes/consultations.ts** - Removed redundant auth middleware
3. **server/lib/storage.ts** - Better S3/local fallback detection

### What Works Now
- ✅ Consultations endpoint accessible and authenticated
- ✅ Socket.IO polling and WebSocket on production with proper CORS
- ✅ Document uploads with automatic S3/local fallback
- ✅ AI generation with proper quota enforcement
- ✅ Real-time messaging with reliable presence tracking

### Testing Recommendations
After deployment:
1. Test each endpoint from the browser console (network tab)
2. Open Socket.IO connection and send/receive messages
3. Upload a test document and verify it's stored
4. Try AI generation (may return 503 if provider not configured)
5. Call `/api/debug/errors` to verify all services are healthy

## Support

If you encounter issues:
1. Check `/api/debug/errors` first
2. Review the logs using `railway logs` command
3. Verify all environment variables are set correctly
4. Test with the diagnostic endpoints above

All code changes have been tested and pushed to GitHub (commit `bb7efb6`).
