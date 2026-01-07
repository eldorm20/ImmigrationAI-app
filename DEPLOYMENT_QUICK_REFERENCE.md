# 🚀 RAILWAY DEPLOYMENT - QUICK REFERENCE CARD

## PHASE 1: Environment Variables ⚙️
**Time: 5 minutes | Action: Set variables in Railway dashboard**

### Copy-Paste Variables
```
ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app
NODE_ENV=production
APP_URL=https://immigrationai-app-production-b994.up.railway.app
JWT_SECRET=YourVeryLongSecureString32CharMinimum1234567890
REFRESH_SECRET=AnotherVeryLongSecureString32CharMinimum9876543210
PORT=5000
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

### Steps
1. Go to https://railway.app/dashboard
2. Click your project → Click "App" service
3. Click "Variables" tab
4. Paste variables above
5. Click "Deploy" button
6. ⏳ Wait 2-3 minutes for green checkmark
7. ✅ Check logs - should see "Server listening on port 5000"

---

## PHASE 2: Redis Service 📦
**Time: 5 minutes | Action: Add Redis from Railway Services**

### Steps
1. Click "+ Add Service" in Railway
2. Choose "Redis"
3. Click "Add Plugin"
4. ⏳ Wait 1-2 minutes for startup
5. Go back to "App" service
6. Click "Deploy"
7. ✅ Check logs - should see "Redis connected"

**⚠️ DO NOT manually set REDIS_URL - Railway does it automatically**

---

## PHASE 3: Ollama AI Service 🤖
**Time: 20-30 minutes | Action: Add Ollama Docker image**

### Steps
1. Click "+ Add Service" in Railway
2. Choose "Docker Image"
3. Image Name: `ollama/ollama:latest`
4. Click "Deploy"
5. ⏳ Wait 1-2 minutes for service to start
6. Click on "ollama" service
7. Click "Settings"
8. Set Memory to **8 GB** ← CRITICAL!
9. Click on "Volumes" → Add Volume:
   - Mount Path: `/root/.ollama`
10. Go back to "App" service
11. Click "Variables" tab
12. Add these two variables:
    ```
    LOCAL_AI_URL=http://ollama:11434/api/generate
    OLLAMA_MODEL=mistral
    ```
13. Click "Deploy" on App service
14. ⏳ **WAIT 20-30 MINUTES** - Ollama is pulling the 4GB model
    - Check Ollama service logs to see progress
    - Don't interrupt or restart!
15. ✅ When done, logs should show:
    ```
    🤖 Ollama initialized
    ✅ Model loaded: mistral
    ```

---

## PHASE 4: Test Everything ✅

### Test A: Health Check
```
Visit: https://immigrationai-app-production-b994.up.railway.app/health
Expected: {"status":"healthy", "database":"connected", "redis":"connected"}
```

### Test B: No WebSocket Errors
- Open app in browser
- Press F12 (Developer Tools)
- Go to "Console" tab
- Should see NO red error messages
- Go to "Network" tab
- Look for `socket.io` requests
- Should see them succeed (not red)

### Test C: Can Login
- Try logging in
- Should work without errors
- After login, open Console and run:
  ```javascript
  localStorage.getItem('accessToken')
  ```
- Should return a long token string

### Test D: Consultations Endpoint
- Make sure you're logged in
- Open Console and run:
  ```javascript
  fetch('/api/consultations', {credentials: 'include'})
    .then(r => r.json()).then(console.log)
  ```
- Should show array of consultations (NOT 404)

### Test E: Upload Document
- Try uploading a test document
- Should succeed (NOT 500 error)
- Should appear in documents list

### Test F: AI Features
- Ask the AI a question
- Should get response
- First response takes 10-60 seconds (model initializing)
- Subsequent responses are faster

---

## SERVICE STATUS CHECKLIST

After all phases, check Railway dashboard:

```
✅ App Service              [Running] Green
✅ PostgreSQL              [Running] Green
✅ Redis                   [Running] Green
✅ Ollama                  [Running] Green
```

All green? **YOUR APP IS PRODUCTION READY!** 🎉

---

## TROUBLESHOOTING QUICK FIXES

| Problem | Quick Fix |
|---------|-----------|
| App won't start | Restart app service, wait 2 min, redeploy |
| Redis disabled | Check REDIS_URL exists, hard restart app |
| Ollama not loading | Check 8GB memory, check logs, wait longer |
| WebSocket errors | Clear cache (Ctrl+Shift+Del), refresh (Ctrl+Shift+R) |
| 404 on consultations | Make sure you're logged in |
| Upload returns 500 | Check server logs for exact error |

---

## ENVIRONMENT VARIABLES CHECKLIST

After each phase, verify these are set:

**Phase 1 (App Service Variables)**
- [ ] ALLOWED_ORIGINS
- [ ] NODE_ENV=production
- [ ] APP_URL
- [ ] JWT_SECRET
- [ ] REFRESH_SECRET
- [ ] PORT=5000
- [ ] STRIPE keys

**Phase 2 (Auto-Added by Redis)**
- [ ] DATABASE_URL (PostgreSQL, auto-set)
- [ ] REDIS_URL (auto-set by Redis)

**Phase 3 (After Ollama Service)**
- [ ] LOCAL_AI_URL=http://ollama:11434/api/generate
- [ ] OLLAMA_MODEL=mistral

---

## MONITORING LOGS

### Where to Check Logs
Railway Dashboard → Service → "Logs" tab

### Expected Log Messages

**App Service**:
```
✅ Database connected successfully
✅ Redis connected to redis://...
✅ Email queue initialized
🤖 Ollama initialized
✅ Model loaded: mistral
✨ Server listening on port 5000
```

**Ollama Service**:
```
pulling manifest
pulling layers
✅ success
```

**Redis Service**:
```
Ready to accept connections
```

### RED FLAG Logs (If You See These, Something's Wrong)
```
❌ Failed to connect to Redis
❌ Database connection failed
❌ Cannot find Ollama service
❌ 500 Internal Server Error
❌ CORS error
```

If you see red flags, refer to [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

---

## TIMELINE ESTIMATE

```
Phase 1: [====] 5 min    (SET VARIABLES)
Phase 2: [====] 5 min    (ADD REDIS)
Phase 3: [============] 20-30 min (ADD OLLAMA + WAIT)
Phase 4: [====] 5 min    (VERIFY TESTS)

Total:  ~40-50 minutes   ⏱️
```

---

## SUCCESS = ALL GREEN ✅

```
🟢 App is running
🟢 Database is connected
🟢 Redis is connected
🟢 Ollama is initialized
🟢 WebSocket works
🟢 API endpoints respond
🟢 AI features work
🟢 Documents upload
🟢 Notifications queue
🟢 Stripe processes payments

YOUR PLATFORM IS LIVE! 🚀
```

---

## 🔧 NEED HELP?

1. **Read**: [COMPLETE_DEPLOYMENT_GUIDE.md](COMPLETE_DEPLOYMENT_GUIDE.md)
2. **Check**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
3. **Monitor**: Railway dashboard → Logs tab
4. **Browser Console**: F12 → Console for JavaScript errors
5. **Network Requests**: F12 → Network for failed API calls

---

**START WITH PHASE 1 NOW! Each phase is just 5 minutes of work.** ⏱️
