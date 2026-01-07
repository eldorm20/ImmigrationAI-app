# Production Deployment Guide

This application is designed to run on services like Railway, Vercel, or standard Docker environments.

## Environment Variables

### Critical (Required)
- `DATABASE_URL`: Connection string for PostgreSQL (e.g., `postgresql://user:pass@host:5432/dbname`)
- `SESSION_SECRET`: A long random string for session security.

### AI Configuration (Pick One)
To enable "Advanced AI" features (Neural Chat, Document Analysis, etc.), you **Must** configure one of the following providers. If missing, AI features will return errors.

#### Option A: Ollama (Recommended for Self-Hosted/Local)
- `LOCAL_AI_URL` or `OLLAMA_URL`: The full URL to your Ollama API (e.g. `http://host.docker.internal:11434/api/generate` or `https://my-ollama.railway.app/api/generate`)
- `OLLAMA_MODEL`: Model name (default: `neural-chat`)

#### Option B: OpenAI (Fallback)
- `OPENAI_API_KEY`: Your OpenAI API Key (sk-...). Uses `gpt-3.5-turbo` by default.

#### Option C: Hugging Face (Fallback)
- `HUGGINGFACE_API_TOKEN`: Access Token
- `HF_MODEL`: Model ID (e.g. `mistralai/Mistral-7B-Instruct-v0.2`)

### Storage (Optional)
By default, the app uses PostgreSQL `file_blobs` table for storage.
- `AWS_ACCESS_KEY_ID`: For S3 (optional)
- `AWS_SECRET_ACCESS_KEY`: For S3 (optional)
- `S3_BUCKET`: For S3 (optional)

## Verification
After deployment, visit:
- `/api/health`: Check DB connection
- `/api/public-stats`: Check real-time stats
