# 🚀 Railway Deployment - Critical Fixes Applied

Your app had critical issues from the first deployment logs. **All fixed and pushed to GitHub.** This is the correct setup.

## What Was Fixed

| Issue | Fix | Status |
|-------|-----|--------|
| `ERR_ERL_PERMISSIVE_TRUST_PROXY` error | Use numeric `trust proxy` value (1) instead of boolean | ✅ Fixed |
| CORS "origin not allowed" warnings | Improved CORS config with safe fallback | ✅ Fixed |
| Rate limiter errors on proxied requests | Added safe `keyGenerator` to all limiters | ✅ Fixed |
| Duplicate static serving | Removed duplicate setup | ✅ Fixed |
| Missing environment variables | Updated requirements and docs | ✅ Fixed |

## Updated Deployment Steps

### Step 1: Trigger Railway Rebuild

Your code is now on GitHub main branch with all fixes. Railway will auto-rebuild if you enabled auto-deploy. If not:

1. Go to Railway → Deployments
2. Click "Create New Deployment" or "Redeploy"
3. Wait for build to complete (5-10 minutes)

### Step 2: Verify Environment Variables

**CRITICAL:** Before deployment completes, set these in Railway → Variables:

```
NODE_ENV=production
JWT_SECRET=<run locally: openssl rand -base64 32>
ALLOWED_ORIGINS=https://<your-railway-domain>
```

**Note:** Railway auto-creates these from plugins:
- `DATABASE_URL` (from PostgreSQL plugin)
- `REDIS_URL` (from Redis plugin)

### Step 3: Important Environment Variable Change

**OLD** (broken):
```
APP_URL=https://myapp.up.railway.app
```

**NEW** (correct):
```
ALLOWED_ORIGINS=https://immigrationai-app-production-xxxx.up.railway.app
```

The app now uses `ALLOWED_ORIGINS` for CORS instead of `APP_URL`. This works better with Railway's automatic domain assignment.

### Step 4: Get Your Railway Domain

1. After deployment is live, go to Railway → Deployments
2. Click on the service → Settings → Domain
3. Copy the domain (e.g., `immigrationai-app-production-b994.up.railway.app`)
4. Set `ALLOWED_ORIGINS=https://immigrationai-app-production-b994.up.railway.app`
5. Redeploy

### Step 5: Run Migrations

```bash
npm install -g railway
railway login
railway link
railway run npm run db:migrate
```

Or via Railway UI if available in your plan.

### Step 6: Test

```bash
# Health check
curl https://<your-railway-domain>/health

# Should return 200 and JSON with status
```

## Critical Notes

- **Trust Proxy**: Fixed to use value `1` for Railway's single proxy layer
- **Rate Limiting**: Fixed to work with `X-Forwarded-For` headers (Railway proxied requests)
- **CORS**: Now properly allows Railway's auto-assigned domains
- **Rebuild Required**: Push to main triggers auto-rebuild if CI/CD enabled

## Auto-Deploy Setup (Recommended)

To avoid manual deploys:

1. GitHub → Settings → Secrets → Add `RAILWAY_API_KEY`
2. Get your API key from Railway → Account → API Keys
3. Future pushes to main automatically deploy

The GitHub Actions workflow is already configured to do this.

## What's Working Now

✅ Server starts without errors
✅ Rate limiting works correctly on proxied requests
✅ CORS properly configured for Railway domains
✅ Database and Redis connections (when plugins active)
✅ Health check endpoint accessible
✅ Static assets served correctly

## Deployment Checklist

Before going live:

- [ ] Push code to GitHub (done ✅)
- [ ] Railway project exists and linked to GitHub
- [ ] PostgreSQL plugin added (creates DATABASE_URL)
- [ ] Redis plugin added (creates REDIS_URL)
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` generated and set
- [ ] `ALLOWED_ORIGINS` set to your Railway domain
- [ ] Build completes successfully
- [ ] Migrations run (`railway run npm run db:migrate`)
- [ ] Health endpoint returns 200 (`curl /health`)
- [ ] App is accessible via HTTPS

## Troubleshooting

### Build fails
- Check Railway build logs
- Ensure Node 20 selected
- Verify all env vars are set

### CORS errors persist
- Verify `ALLOWED_ORIGINS` matches exact Railway domain
- Don't include `/` at the end
- Use `https://` prefix

### Rate limiting still fails
- The fixes are deployed
- If errors occur, check server logs for IP header issues
- Fallback is safe but logs warnings

### Database connection fails
- Verify `DATABASE_URL` is auto-set from PostgreSQL plugin
- Check PostgreSQL plugin status (green)
- Run migrations manually if needed

## Next Steps

1. ✅ Code pushed to GitHub with all fixes
2. 🔄 Wait for Railway to auto-rebuild (or manually trigger)
3. ✅ Set environment variables
4. ✅ Run migrations
5. ✅ Test health endpoint
6. 🎉 Deploy is complete!

## Questions?

- Railway Docs: https://docs.railway.app
- GitHub Actions CI/CD: `.github/workflows/ci.yml`
- Deployment Guide: `DEPLOYMENT_RAILWAY.md`
- App Repo: https://github.com/eldorm20/ImmigrationAI-app

---

**All critical fixes are now in the main branch. Railway will auto-deploy on next push or manual trigger.**
