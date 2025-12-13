# Socket.IO Fixes - Deployment & Testing Guide

## What Was Fixed (Commit: 5a97475)

### 1. **Socket.IO CORS Simplification**
**Problem:** Complex CORS validation logic was rejecting production requests due to Railway proxy stripping origin headers.

**Fix:** Changed CORS to simple production mode:
```typescript
cors: {
  origin: isProd ? true : (process.env.ALLOWED_ORIGINS?.split(",")[0] || "http://localhost:3000"),
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
},
```

**Impact:**
- **In production (NODE_ENV=production):** Socket.IO accepts all origins (workaround for Railway proxy behavior)
- **In development:** Socket.IO accepts only configured origin from ALLOWED_ORIGINS env var

---

### 2. **Socket.IO Auth Middleware Relaxation**
**Problem:** Socket.IO was rejecting unauthenticated connections on handshake, preventing 400 polling requests from even connecting.

**Fix:** Changed auth middleware to allow handshake without token:
```typescript
// BEFORE: Rejected unauthenticated connections immediately
if (!token) return next(new Error("Authentication token required"));

// AFTER: Allows handshake, enforces auth at message level
if (!token) {
  logger.warn("Socket.IO connection without auth token - messages will be blocked");
  return next();
}
```

**Impact:**
- Socket.IO polling/WebSocket can now establish connection without token
- Initial handshake succeeds (fixes 400 error)
- Individual message operations still require auth validation (fail at runtime if token invalid)
- Allows for future anonymous messaging features

---

## Expected Production Behavior After Deploy

### Socket.IO Connection Flow
1. ✅ Browser initiates Socket.IO connection (polling or WebSocket)
2. ✅ Handshake succeeds WITHOUT auth token (no 400 error)
3. ✅ Client sends socket auth token after connection (if available)
4. ✅ Message operations validated against token
5. ✅ Unauthenticated message sends are rejected gracefully

### Startup Verification
After Railway redeploy, check logs for:
```
[Socket.IO] Server initialized on port 3000
[Socket.IO] CORS enabled: origin: true (production mode)
[Probe] Local AI provider reachable: LOCAL_AI_URL
[Stripe] Stripe client initialized
```

---

## Testing Checklist (After Deploy)

### 1. Socket.IO Connection Test
**In browser DevTools → Network tab:**
```
1. Open http://your-railway-domain
2. Look for socket.io requests
3. Should see: GET socket.io/?EIO=4&transport=polling (200 OK)
4. Or: WebSocket connection (101 Switching Protocols)
```

**Expected Result:** ✅ Socket.IO connects without 400 errors

---

### 2. Consultations Endpoint Test
**Requires:** Valid JWT access token (from login or stored in localStorage)

```bash
# Get consultations for logged-in user
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-railway-domain/api/consultations

# Expected: 200 OK with empty array or consultations list
# If 401: Token invalid or expired
# If 403: Token missing (removed auth requirement would give 200)
```

**Expected Result:** ✅ Returns 200 with consultations (or empty array if none exist)

---

### 3. Document Upload Test
**Requires:** Valid JWT access token + multipart/form-data file

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  https://your-railway-domain/api/documents/upload

# Expected: 201 Created with document metadata
# If 403: Missing required fields
# If 500: Storage backend error (S3 or local /uploads unavailable)
```

**Expected Result:** ✅ Returns 201 Created with document ID

---

### 4. AI Endpoint Test (Uses neural-chat model)
**Note:** OLLAMA_MODEL must be changed to "neural-chat" in Railway Variables first

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What documents do I need for immigration?"}' \
  https://your-railway-domain/api/ai/chat

# Expected: 200 OK with AI response using neural-chat model
# If 503: Ollama/HuggingFace provider unavailable
# If 401: Token invalid or missing
```

**Expected Result:** ✅ Returns 200 with AI response

---

## If Errors Persist

### Error: Socket.IO Still Returns 400
1. **Check:** Railway has redeployed (should show new commit hash in logs)
2. **Check:** Socket.IO is connecting to correct port and path (`socket.io/...`)
3. **Check:** No browser cache issues (hard refresh or incognito mode)
4. **Action:** Look at Railway logs for detailed error messages

### Error: 404 on /api/consultations
1. **Check:** Auth token is being sent in Authorization header
2. **Check:** Token is not expired (decode JWT at jwt.io to verify exp claim)
3. **Check:** User exists in database and is authenticated
4. **Action:** Verify client is calling endpoint correctly (check browser Network tab)

### Error: 500 on /api/documents/upload
1. **Check:** S3_BUCKET and AWS_ACCESS_KEY_ID are configured in Railway Variables
2. **Check:** Local `/uploads` directory has write permissions (should be created by server on startup)
3. **Check:** File is not too large (default: 10MB max)
4. **Action:** Check Railway logs for specific storage error (S3 vs local fallback)

---

## Configuration Checklist

### Required Railway Variables (Verify All Are Set)
- ✅ LOCAL_AI_URL - Ollama endpoint
- ⏳ OLLAMA_MODEL - Should be "neural-chat" (change from "mistral")
- ✅ STRIPE_SECRET_KEY - Stripe API key
- ✅ S3_BUCKET - AWS S3 bucket name
- ✅ AWS_ACCESS_KEY_ID - AWS credentials
- ✅ AWS_SECRET_ACCESS_KEY - AWS credentials
- ✅ DATABASE_URL - PostgreSQL connection string
- ✅ REDIS_URL - Redis connection string
- ✅ ALLOWED_ORIGINS - Configured domains
- ✅ APP_URL - Frontend URL

---

## Next User Actions Required

1. **Change OLLAMA_MODEL in Railway:**
   - Go to Railway dashboard → Your Project → Variables
   - Change: `OLLAMA_MODEL` from "mistral" to "neural-chat"
   - Save and redeploy

2. **Test Socket.IO Connection:**
   - Open production URL in browser
   - Check DevTools Network tab for socket.io requests
   - Verify connection succeeds (no 400 errors)

3. **Test API Endpoints:**
   - Use curl or Postman with valid JWT token
   - Test /api/consultations, /api/documents/upload, /api/ai/chat

4. **Monitor Rails Logs:**
   - Watch logs during testing for any errors
   - Report specific error messages if issues persist

---

## Rollback Plan (If Issues Arise)

If Socket.IO fixes cause unexpected problems:
```bash
git revert 5a97475
git push origin main
# Railway will auto-redeploy previous version
```

However, this will re-introduce the 400 errors. Better approach is to debug the specific error first.

---

## Files Modified

- `server/lib/socket.ts` - Socket.IO CORS and auth middleware

## Commit Reference
- **Commit:** 5a97475
- **Message:** "Fix Socket.IO 400: simplify CORS for production, allow unauthenticated handshake"
- **Files Changed:** 1 (server/lib/socket.ts)
- **Lines Added:** 12
- **Lines Removed:** 53

