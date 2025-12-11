# ImmigrationAI - Production Platform

> **Status**: ✅ **PRODUCTION READY** - All features implemented and tested

A comprehensive, production-ready AI-powered immigration assistance platform with real authentication, database, file uploads, real-time messaging, and AI features.

## 🎯 Project Status

| Component | Status | Details |
|-----------|--------|---------|
| Document Upload | ✅ Complete | Reliable S3 storage with presigned URLs |
| AI Document Generation | ✅ Complete | 3 professional templates |
| Translation Service | ✅ Complete | Multi-language support |
| AI Chat | ✅ Complete | Language-aware responses |
| Real-Time Messaging | ✅ Complete | Socket.IO with persistence |
| Lawyer Consultations | ✅ Complete | Full workflow with notifications |
| Multi-Language UI | ✅ Complete | EN, RU, UZ support |
| **Overall Status** | **✅ READY** | **For Production Deployment** |

## 🚀 Features

### Backend
- ✅ **PostgreSQL Database** with Drizzle ORM
- ✅ **Secure Authentication** with Argon2 password hashing and JWT tokens
- ✅ **Role-Based Access Control** (Admin, Lawyer, Applicant)
- ✅ **File Upload System** with S3/Railway storage support and presigned URLs
- ✅ **Real-Time Messaging** via Socket.IO with JWT authentication
- ✅ **AI Features**: Document Generation, Translation, Chat, Visa Eligibility
- ✅ **Consultation Workflow** with email notifications
- ✅ **Security Middleware**: Helmet, CORS, Rate Limiting, Input Validation
- ✅ **Structured Logging** with Pino (PII redaction)
- ✅ **Audit Logging** for sensitive actions

### Frontend
- ✅ **React + Vite** with TypeScript
- ✅ **Real Authentication UI** (Login, Register, Password Reset)
- ✅ **Multi-language Support** (English, Uzbek, Russian) with switcher
- ✅ **Responsive Dashboards** for Applicants, Lawyers, and Admins
- ✅ **Document Upload & Management** with AI generation
- ✅ **Real-Time Messaging** with participants list and persistence
- ✅ **Consultation Management** for applicants and lawyers
- ✅ **AI-Powered Features** integration (chat, translation, documents)

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (optional, for local development)
- Railway account (for deployment)

## 🛠️ Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd ImmigrationAI
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/immigrationai
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com
AWS_REGION=us-east-1
OPENAI_API_KEY=sk-your-openai-api-key
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000
LOG_LEVEL=info
NODE_ENV=development
PORT=5000
```

### 3. Set Up Database

```bash
# Generate migrations from schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

The application will be available at `http://localhost:5000`

## 🐳 Docker Development

```bash
# Start all services (PostgreSQL + App)
docker-compose up

# Run migrations
docker-compose exec app npm run db:migrate
```

## 🚢 Railway Deployment

### 1. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Add a PostgreSQL service
4. Add your application service

### 2. Set Environment Variables

In Railway dashboard, add these environment variables:

- `DATABASE_URL` (automatically set by Railway PostgreSQL)
- `JWT_SECRET` (generate a strong random string)
- `REFRESH_SECRET` (generate a strong random string)
- `S3_BUCKET` (your storage bucket name)
- `AWS_ACCESS_KEY_ID` (if using S3)
- `AWS_SECRET_ACCESS_KEY` (if using S3)
- `S3_ENDPOINT` (S3 endpoint URL)
- `AWS_REGION` (S3 region)
- `OPENAI_API_KEY` (for AI features)
- `ALLOWED_ORIGINS` (your production domain)
- `NODE_ENV=production`
- `PORT` (Railway sets this automatically)

### 3. Deploy

Railway will automatically:
1. Build the Docker image
2. Run migrations on deploy (add to startup command if needed)
3. Start the application

### 4. Run Migrations

After first deploy, run migrations:

```bash
railway run npm run db:migrate
```

Or add to your startup command in Railway settings.

## 📁 Project Structure

```
ImmigrationAI/
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Page components
│       └── lib/         # Utilities (auth, i18n, etc.)
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── lib/             # Utilities (auth, storage, ai, logger)
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle ORM schema
├── migrations/          # Database migrations
└── script/              # Build scripts
```

## 🔐 Security Features

- **Password Hashing**: Argon2 with optimal parameters
- **JWT Tokens**: Access tokens (15min) + Refresh tokens (7 days)
- **Rate Limiting**: Per-route rate limits
- **Input Validation**: Zod schemas for all inputs
- **PII Redaction**: Automatic redaction in logs
- **CORS**: Whitelist-based CORS
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries via Drizzle

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

## ⚙️ Automating Railway Environment Variable Changes

You can update Railway environment variables from a GitHub Action that ships with this repository: `.github/workflows/set-railway-vars.yml`.

Required GitHub repository Secrets:
- `RAILWAY_API_TOKEN` — a Railway API token with permission to change variables
- `RAILWAY_PROJECT_ID` — your Railway project id
- `RAILWAY_VARS` — newline-separated KEY=VALUE pairs (example below)

Example `RAILWAY_VARS` value (store as a single secret):
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
HUGGINGFACE_API_TOKEN=hf_xxx
HF_MODEL=OpenAssistant/replit-1b-instruct
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-jwt-secret
```

How to run:
1. Add the three repository secrets above in GitHub (Settings → Secrets & variables → Actions).
2. Run the workflow from the Actions tab or push to `main` to trigger it. The workflow will login to Railway and set the variables for the configured project.

Security: Keep secrets in GitHub Secrets. Do NOT check secret values into the repository.
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Applications
- `GET /api/applications` - List applications (with filters)
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application
- `PATCH /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `DELETE /api/documents/:id` - Delete document

### AI Features
- `GET /api/ai/eligibility/questions` - Get eligibility questions
- `POST /api/ai/eligibility/check` - Check visa eligibility
- `POST /api/ai/documents/analyze/:id` - Analyze document
- `POST /api/ai/interview/questions` - Generate interview questions
- `POST /api/ai/interview/evaluate` - Evaluate interview answer

### Stats
- `GET /api/stats` - Get dashboard statistics

### Health
- `GET /health` - Health check endpoint

## 🔧 Database Schema

The application uses the following main tables:

- `users` - User accounts with roles
- `applications` - Visa applications
- `documents` - Uploaded documents
- `consultations` - Lawyer consultations
- `payments` - Payment records
- `messages` - Chat messages
- `audit_logs` - Audit trail
- `refresh_tokens` - JWT refresh tokens

## 🌍 Internationalization

The application supports:
- English (en)
- Uzbek (uz)
- Russian (ru)

Language can be changed in the UI and is persisted in localStorage.

## 📦 Production Checklist

- [ ] Set strong `JWT_SECRET` and `REFRESH_SECRET`
- [ ] Configure production database
- [ ] Set up S3/Railway storage bucket
- [ ] Add OpenAI API key
- [ ] Configure CORS with production domains
- [ ] Run database migrations
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Set up email service (for verification/reset)
- [ ] Review and adjust rate limits
- [ ] Enable HTTPS
- [ ] Set up error tracking (Sentry, etc.)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For support, email support@immigrationai.com or open an issue on GitHub.







