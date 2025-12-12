# ImmigrationAI Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ (local or cloud)
- Git
- (Optional) Docker for containerized deployment

---

## Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/eldorm20/ImmigrationAI-app.git
cd ImmigrationAI-app

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Configure Environment
Create `.env` file in project root:
```bash
# Database (use local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/immigration_ai

# Stripe (get from stripe.com/dashboard)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_pro_test
STRIPE_PREMIUM_PRICE_ID=price_premium_test

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=immigrationai-test-bucket

# AI Providers (use free tier or test keys)
OPENAI_API_KEY=sk_test_your_openai_key
HUGGINGFACE_API_TOKEN=hf_your_token
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct

# Server Config
PORT=5000
NODE_ENV=development
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000
```

### 3. Setup Database
```bash
# Create local PostgreSQL database
createdb immigration_ai

# Run migrations
npm run db:push
```

### 4. Start Development Servers
Open two terminal windows:

**Terminal 1 - Backend:**
```bash
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
# Frontend runs on http://localhost:3000
```

### 5. Test the Application
Open browser: http://localhost:3000

**Test User 1 (Applicant):**
- Email: `applicant@test.com`
- Password: `Test123!`

**Test User 2 (Lawyer):**
- Email: `lawyer@test.com`
- Password: `Test123!`

---

## Key Features to Test

### ✅ Authentication
- [ ] Register new account
- [ ] Login with email/password
- [ ] Logout
- [ ] Forgot password flow

### ✅ Subscription (Free Tier)
- [ ] View subscription plans
- [ ] See current tier (Free)
- [ ] Check feature limits (5 uploads, 2 AI gens)

### ✅ Document Upload
- [ ] Upload first document
- [ ] Upload second document
- [ ] Try uploading 6th document → should get rate limit error

### ✅ AI Features
- [ ] Generate motivation letter (uses 1/2 monthly quota)
- [ ] Generate second document (uses 2/2 monthly quota)
- [ ] Try generating 3rd document → should get rate limit error

### ✅ Visa Application Tracking
- [ ] Create new application
- [ ] Select visa type (student/work/family)
- [ ] View roadmap with milestones
- [ ] Add custom milestone

### ✅ Real-time Messaging
- [ ] Open messaging panel
- [ ] Send message to lawyer
- [ ] Receive response in real-time

### ✅ Multi-language Support
- [ ] Click language selector (top right)
- [ ] Switch between English, Uzbek, Russian, German, French, Spanish
- [ ] Verify UI translates

### ✅ Lawyer Console (if using lawyer account)
- [ ] View client list
- [ ] View consultation bookings
- [ ] Track earnings

---

## Upgrade to Pro Plan (Testing Payment)

### 1. Get Stripe Test Card
Visit https://stripe.com/docs/testing#test-cards

Use this test card:
- **Number:** 4242 4242 4242 4242
- **Expiry:** 12/34
- **CVC:** 123

### 2. Upgrade Plan
- Click "Upgrade" in subscription section
- Select "Pro" plan ($29/month)
- Click "Continue"
- You'll be redirected to Stripe checkout
- Use test card above
- Complete payment

### 3. Verify Upgrade
- Return to app
- Check subscription now shows "Pro"
- Upload limit should now be 50/month
- AI generation limit should be 20/month

---

## Troubleshooting

### "npm not found"
```bash
# Install Node.js from https://nodejs.org/
# Verify installation
node --version
npm --version
```

### "Database connection refused"
```bash
# Check PostgreSQL is running
psql -U postgres -d immigration_ai

# If not installed:
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org
```

### "Stripe key not set"
```bash
# Get test keys from https://dashboard.stripe.com/test/apikeys
# Add to .env file:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### "S3 upload fails"
```bash
# Option 1: Use Railway Spaces instead of AWS S3
# Set AWS_S3_ENDPOINT and region to Railway Spaces

# Option 2: Mock file storage in dev
# Files will be stored locally in /uploads directory
```

### "Socket.IO connection fails"
```bash
# Check CORS configuration in .env
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# Clear browser cache and hard refresh (Ctrl+Shift+R)
```

### Build errors during "npm run build"
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules
npm install && cd client && npm install && cd ..

# Then rebuild
npm run build
```

---

## Docker Deployment (Optional)

### Build Docker Image
```bash
docker build -t immigrationai-app:latest .
```

### Run with Docker Compose
```bash
# Create docker-compose.yml or use existing one
docker-compose up -d

# Check logs
docker-compose logs -f web
```

### Run Standalone Container
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e AWS_ACCESS_KEY_ID=... \
  immigrationai-app:latest
```

---

## Production Deployment

### Deploy to Railway.app (Recommended)

1. **Push to GitHub:**
```bash
git push origin main
```

2. **Connect to Railway:**
   - Go to https://railway.app
   - Click "New Project" → "GitHub Repo"
   - Select your repository
   - Approve Railway GitHub app

3. **Set Environment Variables:**
   - Click "Add variables"
   - Set all required variables from .env

4. **Deploy:**
   - Railway auto-deploys on git push
   - Check deployment status in dashboard

5. **Get Production URL:**
   - Railway provides domain like: `immigrationai-app.up.railway.app`
   - Update ALLOWED_ORIGINS with production domain

### Deploy to Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create immigrationai-app

# Set environment variables
heroku config:set DATABASE_URL=postgresql://...
heroku config:set STRIPE_SECRET_KEY=sk_...

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Deploy to Your Own Server

```bash
# Build for production
npm run build

# Start server
npm run start

# Use process manager (PM2)
npm install -g pm2
pm2 start dist/index.cjs --name "immigrationai"
pm2 save
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | ✅ | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | ✅ | Stripe price ID for Pro tier |
| `STRIPE_PREMIUM_PRICE_ID` | ✅ | Stripe price ID for Premium tier |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS secret key for S3 |
| `AWS_REGION` | ✅ | AWS region (e.g., us-east-1) |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name |
| `OPENAI_API_KEY` | ⚠️ | OpenAI API key (for AI features) |
| `HUGGINGFACE_API_TOKEN` | ⚠️ | HuggingFace token (fallback AI) |
| `HUGGINGFACE_MODEL` | ⚠️ | HuggingFace model name |
| `PORT` | ❌ | Server port (default: 5000) |
| `NODE_ENV` | ❌ | Environment (development/production) |
| `HOST` | ❌ | Server host (default: 0.0.0.0) |
| `ALLOWED_ORIGINS` | ❌ | CORS allowed origins |
| `REDIS_URL` | ❌ | Redis connection (optional) |

---

## API Documentation

### Authentication
```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "applicant"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secure123"
}

# Response
{
  "user": { "id": "...", "email": "...", "role": "..." },
  "token": "eyJhbGc..."
}
```

### Subscriptions
```bash
# Get current subscription
GET /api/subscription/current
Authorization: Bearer <token>

# Upgrade to Pro
POST /api/subscription/upgrade
Authorization: Bearer <token>
{
  "tier": "pro"
}

# Check feature access
GET /api/subscription/check/documentUploadLimit
Authorization: Bearer <token>
```

### Documents
```bash
# Upload document
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
file: <binary file>

# List documents
GET /api/documents
Authorization: Bearer <token>

# Delete document
DELETE /api/documents/:id
Authorization: Bearer <token>
```

### AI Features
```bash
# Generate document
POST /api/ai/documents/generate
Authorization: Bearer <token>
{
  "template": "Motivation Letter",
  "data": { "name": "Jane", "role": "Engineer" },
  "language": "en"
}

# Analyze document
POST /api/ai/documents/analyze/:documentId
Authorization: Bearer <token>

# Chat with AI
POST /api/ai/chat
Authorization: Bearer <token>
{
  "message": "What documents do I need for a US work visa?",
  "language": "en"
}
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start backend
npm run dev:client       # Start frontend
npm run check            # TypeScript type check

# Database
npm run db:push          # Apply migrations
npm run db:generate      # Generate new migration
npm run db:migrate       # Run migrations with tsx

# Production
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests with Playwright

# Utilities
npm run tools:gen-doc    # Generate sample documents
```

---

## Support

- 📧 **Issues:** Report bugs on GitHub Issues
- 💬 **Discussions:** Ask questions in GitHub Discussions
- 📖 **Documentation:** See COMPLETE_PLATFORM_STATUS.md for full docs
- 🐛 **Bug Reports:** Include error logs and reproduction steps

---

## Next Steps

1. ✅ **Complete this quick start**
2. 📚 **Read COMPLETE_PLATFORM_STATUS.md for full documentation**
3. 🔧 **Customize for your use case**
4. 🚀 **Deploy to production**
5. 📊 **Monitor usage and analytics**

---

**Happy coding! 🎉**

Questions? Check the documentation or open an issue on GitHub.
