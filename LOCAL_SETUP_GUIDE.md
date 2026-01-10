# Local Development Setup Guide

This guide will help you set up the ImmigrationAI application locally for development and testing.

## Prerequisites

### Required Software

1. **Node.js 20+** (Required)
   - Download from: https://nodejs.org/
   - Choose the LTS version (20.x or higher)
   - After installation, verify with: `node --version` and `npm --version`

2. **PostgreSQL 16+** (Required)
   - Option A: Install PostgreSQL locally
     - Download from: https://www.postgresql.org/download/windows/
     - Default port: 5432
     - Create database: `immigrationai`
   - Option B: Use Docker (Recommended - easier setup)
     - Install Docker Desktop: https://www.docker.com/products/docker-desktop/
     - We'll use docker-compose to run PostgreSQL, Redis, and Ollama

3. **Git** (Required)
   - Should already be installed if you cloned from GitHub
   - Verify with: `git --version`

### Optional (for full AI features)

4. **Docker Desktop** (Recommended)
   - For running PostgreSQL, Redis, and Ollama locally
   - Download from: https://www.docker.com/products/docker-desktop/

## Step-by-Step Setup

### Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download Node.js 20.x LTS (or higher)
3. Run the installer
4. Restart your terminal/PowerShell
5. Verify installation:
   ```powershell
   node --version  # Should show v20.x.x or higher
   npm --version   # Should show 10.x.x or higher
   ```

### Step 2: Set Up Database (Choose One Option)

#### Option A: Using Docker (Recommended - Easiest)

1. Install Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Start Docker Desktop
3. Navigate to project directory:
   ```powershell
   cd C:\Users\samsap\Documents\ImmigrationAI-app
   ```
4. Start database services:
   ```powershell
   docker-compose up -d postgres redis
   ```
5. Wait for services to be healthy (check with `docker-compose ps`)
6. Database will be available at: `postgresql://postgres:postgres@localhost:5432/immigrationai`

#### Option B: Install PostgreSQL Locally

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the postgres user password you set
4. Create database:
   ```sql
   CREATE DATABASE immigrationai;
   ```
5. Update `.env` file with your PostgreSQL credentials:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/immigrationai
   ```

### Step 3: Configure Environment Variables

The `.env` file has been created with default values. Review and update if needed:

**Important variables to check:**
- `DATABASE_URL` - Should match your PostgreSQL setup
- `JWT_SECRET` - Change to a random 32+ character string for security
- `REFRESH_SECRET` - Change to a random 32+ character string for security
- `ALLOWED_ORIGINS` - Should include `http://localhost:5000`

**For AI features, choose one:**
- `OPENAI_API_KEY` - If you have OpenAI API key
- `LOCAL_AI_URL` - If using Ollama (recommended for local dev)
- `HUGGINGFACE_API_TOKEN` - If using HuggingFace

### Step 4: Install Dependencies

1. Install root dependencies:
   ```powershell
   cd C:\Users\samsap\Documents\ImmigrationAI-app
   npm install
   ```

2. Install client dependencies:
   ```powershell
   cd client
   npm install
   cd ..
   ```

### Step 5: Set Up Database Schema

Run migrations to create database tables:

```powershell
npm run db:migrate
```

If you want to seed sample data (lawyers, applications):
```powershell
npm run db:seed
```

### Step 6: Set Up AI (Optional but Recommended)

#### Option A: Ollama (Local AI - Free, Recommended)

1. Start Ollama service (if using Docker):
   ```powershell
   docker-compose up -d ollama
   ```

2. Wait for Ollama to start (about 30 seconds)

3. Pull a model (this may take several minutes):
   ```powershell
   docker exec immigrationai-ollama ollama pull mistral
   ```

   Or if Ollama is installed locally:
   ```powershell
   ollama pull mistral
   ```

4. Verify Ollama is working:
   - Check `.env` has: `LOCAL_AI_URL=http://127.0.0.1:11434/api/generate`
   - Check `.env` has: `OLLAMA_MODEL=mistral`

#### Option B: OpenAI (Requires API Key)

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```

### Step 7: Start the Application

#### Development Mode (Recommended)

Start both server and client in development mode:

```powershell
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend client
npm run dev:client
```

The application will be available at:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api

#### Using Docker Compose (All Services)

If you want to run everything with Docker:

```powershell
docker-compose up
```

This will start:
- PostgreSQL database
- Redis cache
- Ollama AI
- Application server

### Step 8: Verify Setup

1. **Health Check:**
   ```powershell
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"healthy","database":"connected",...}`

2. **Test Login:**
   - Open http://localhost:5000
   - Try logging in with test credentials:
     - Client: `eldorbekmukhammadjonov@gmail.com` / `Ziraat123321**`
     - Lawyer: `furxat.19.97.12@gmail.com` / `Ziraat123321**`

3. **Test AI Features:**
   - Navigate to AI chat or document analysis
   - Verify AI responses are working

## Troubleshooting

### Database Connection Issues

**Error: "Database connection failed"**
- Check PostgreSQL is running: `docker-compose ps` or check Windows Services
- Verify DATABASE_URL in `.env` is correct
- Check database exists: `psql -U postgres -l` (should see `immigrationai`)

**Error: "relation does not exist"**
- Run migrations: `npm run db:migrate`
- Check migrations folder exists and has SQL files

### Node.js Not Found

**Error: "node is not recognized"**
- Install Node.js from https://nodejs.org/
- Restart terminal/PowerShell after installation
- Verify PATH includes Node.js installation directory

### Port Already in Use

**Error: "Port 5000 already in use"**
- Change PORT in `.env` to another port (e.g., 5001)
- Or stop the process using port 5000:
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### AI Features Not Working

**Error: "AI provider not configured"**
- Set up at least one AI provider:
  - Ollama: `LOCAL_AI_URL=http://127.0.0.1:11434/api/generate`
  - OpenAI: `OPENAI_API_KEY=sk-...`
  - HuggingFace: `HUGGINGFACE_API_TOKEN=...`

**Ollama model not found:**
- Pull the model: `ollama pull mistral` (or your chosen model)
- Verify model name in `.env` matches: `OLLAMA_MODEL=mistral`

### Dependencies Installation Issues

**Error: "npm install fails"**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- If using Windows, try running PowerShell as Administrator

### Client Build Issues

**Error: "Cannot find module"**
- Make sure you installed both root and client dependencies:
  ```powershell
  npm install
  cd client
  npm install
  ```

## Next Steps

Once everything is working locally:

1. **Test all features:**
   - User registration/login
   - Document upload
   - AI chat
   - Document analysis
   - Real-time messaging
   - Consultation booking

2. **Fix any issues found**

3. **Prepare for Railway deployment:**
   - Review Railway deployment guides in the project
   - Set up Railway environment variables
   - Test deployment process

## Quick Reference Commands

```powershell
# Start database services (Docker)
docker-compose up -d postgres redis ollama

# Install dependencies
npm install
cd client && npm install && cd ..

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev              # Backend
npm run dev:client       # Frontend (in separate terminal)

# Check health
curl http://localhost:5000/health

# View logs
docker-compose logs -f   # Docker services
# Or check server console output
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Check browser console (F12) for frontend errors
4. Verify all environment variables are set correctly
