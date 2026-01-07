# Quick Start - Production Deployment

## ⚡ TL;DR (5 Minutes)

### 1. Clone & Install
```bash
cd ImmigrationAI
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - AWS_S3_BUCKET (or leave empty for Railway)
# - OPENAI_API_KEY or HUGGINGFACE_API_TOKEN
```

### 3. Run Migrations
```bash
npm run migrate
```

### 4. Build & Start
```bash
npm run build:client
npm start
```

**Your app is now running at** `http://localhost:3000`

---

## 🚀 Full Deployment Guide

### Option 1: Local Development

```bash
# Install
npm install
cd client && npm install && cd ..

# Setup
cp .env.example .env
npm run migrate

# Run
npm run dev          # Both backend and client in watch mode
# or
npm start            # Production mode
```

### Option 2: Docker

```bash
# Build
docker build -t immigrationai .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="sk-..." \
  immigrationai
```

### Option 3: Railway (Recommended)

```bash
# Login to Railway
railway login

# Deploy
railway up

# or use GitHub integration for auto-deploy
```

---

## 🔧 Environment Variables

### Required
```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/immigrationai

# AI Provider (choose one or both)
OPENAI_API_KEY=sk-...           # or
HUGGINGFACE_API_TOKEN=hf_...

# App Configuration
APP_URL=https://your-domain.com
NODE_ENV=production
```

### Optional
```bash
# Storage (auto-detect in Railway)
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email (auto-configured in Railway)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Redis (optional, for queue)
REDIS_URL=redis://...

# Security
JWT_SECRET=your-very-long-secret-key-min-32-chars
```

---

## ✅ Verification Checklist

After deployment, verify everything is working:

```bash
# Check server health
curl http://localhost:3000/api/health

# Check database connection
# Should see data in logs without connection errors

# Open in browser
# http://localhost:3000

# Test features:
# - Sign up as applicant
# - Sign up as lawyer
# - Upload a document
# - Generate an AI document
# - Translate text
# - Send a consultation request
# - Check email for notifications
```

---

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :3000   # Windows

# Or use different port
PORT=3001 npm start
```

### Database Connection Failed
```bash
# Verify DATABASE_URL format
# PostgreSQL: postgresql://user:pass@host:5432/db
# Make sure host is reachable from your location
```

### Socket.IO Connection Failed
```bash
# Verify CORS is configured:
# ALLOWED_ORIGINS should include your frontend URL
# Check browser console for WebSocket errors
```

### File Upload Not Working
```bash
# Verify S3/Storage credentials
# Check AWS_S3_BUCKET and AWS_ACCESS_KEY_ID
# Verify bucket exists and has appropriate permissions
```

### AI Services Not Responding
```bash
# Check AI provider key (OPENAI_API_KEY or HUGGINGFACE_API_TOKEN)
# Verify API key has necessary permissions
# Check rate limits on your account
```

---

## 📊 Monitoring

### Logs
```bash
# View server logs
tail -f logs/server.log

# View error logs
tail -f logs/error.log

# Real-time logs in Railway
railway logs
```

### Performance
```bash
# Check memory usage
npm run monitor

# Database query performance
# Automatically logged to console in development
```

---

## 🔐 Security Checklist

Before going live:
- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly (not allow all)
- [ ] Set rate limiting on sensitive endpoints
- [ ] Enable database backups
- [ ] Monitor error logs
- [ ] Setup security alerts
- [ ] Run security scan: `npm audit`

---

## 📈 Performance Tips

1. **Enable Redis** for caching and queues
2. **Use CDN** for static assets
3. **Enable compression** (gzip)
4. **Configure database connection pooling**
5. **Monitor query performance**
6. **Setup monitoring/alerts**

---

## 🚀 Going Live

1. **Test thoroughly** in staging environment
2. **Review pre-deployment checklist** (`PRE_DEPLOYMENT_CHECKLIST_FINAL.md`)
3. **Backup database** before deploying
4. **Deploy to production**
5. **Monitor logs** for 24 hours
6. **Verify all features** work correctly

---

## 📞 Support

- **Documentation**: See `IMPLEMENTATION_COMPLETE.md`
- **Issues**: Check logs and `TROUBLESHOOTING.md`
- **Questions**: Review code comments and architecture docs

---

## 🎉 You're Ready!

The ImmigrationAI platform is production-ready. Follow the deployment steps above and enjoy your fully functional immigration assistance platform.

**Status**: ✅ Ready for Production
**Quality**: ✅ Enterprise-Grade
**Support**: ✅ Full Documentation Included
