# Railway Deployment Guide

This guide details how to configure your Railway project to match the intended architecture (ImmigrationAI App + RAG Service + ChromaDB + Ollama).

## Service Configuration

Your `railway.toml` has been updated to include:
1.  **web**: The main Node.js application.
2.  **rag-service**: The Python FastAPI RAG microservice.
3.  **chromadb**: The Vector Database.
4.  **ollama**: The AI Model provider.

## Environment Variables

You need to set the following Environment Variables in your Railway Project Dashboard. You can set them in the "Shared Variables" section or per-service.

### Shared Variables (Apply to all services)
*   `NODE_ENV`: `production`

### Service: `web` (ImmigrationAI-app)
*   `DATABASE_URL`: (Automatically provided by Railway Postgres plugin)
*   `REDIS_URL`: (Automatically provided by Railway Redis plugin)
*   `VITE_API_URL`: `/api` (or your full domain, e.g. `https://your-app.up.railway.app/api`)
*   `RAG_SERVICE_URL`: `http://rag-service:8000` (Internal Railway URL)
*   `CHROMA_URL`: `http://chromadb:8000` (Internal Railway URL)
*   `OLLAMA_URL`: `http://ollama:11434` (Internal Railway URL)
*   `VITE_VAPI_PUBLIC_KEY`: `2bef7e95-1052-4f7e-92fd-28aea3c3ff04`
*   `VITE_VAPI_ASSISTANT_ID`: `e61ced86-058c-4813-88e7-62ee549a0036`

### Service: `rag-service`
*   `CHROMA_URL`: `http://chromadb:8000` (REQUIRED to connect to the separate Chroma service)
*   `PORT`: `8000` (Default, but Railway assigns one. If using custom start command, ensure it binds to `$PORT` or `0.0.0.0`)

### Service: `chromadb`
*   No specific env vars needed usually, it exposes port 8000.

### Service: `ollama`
*   `OLLAMA_HOST`: `0.0.0.0`
*   `OLLAMA_ORIGINS`: `*` (To allow connections from other services)

## Verification
1.  **Push** these changes to your repository.
2.  Railway should detect the new `rag-service` from `railway.toml`.
3.  Ensure `web` service builds and starts.
4.  Ensure `rag-service` builds and starts (it might take a moment to install Python dependencies).

## Troubleshooting
*   **RAG Connection Failed**: Check `RAG_SERVICE_URL` in `web` service. Ensure `rag-service` is listening on `0.0.0.0`.
*   **Chroma Connection Failed**: Check `CHROMA_URL` in `rag-service`.
*   **Ollama Connection Failed**: Check `OLLAMA_URL` and ensure `ollama` service is running.
*   **App Crashes / DATABASE_URL missing**: 
    *   Ensure you have a **PostgreSQL** service in your Railway project.
    *   If you don't see one, create it (New -> Database -> PostgreSQL).
    *   **Link it**: Drag a line from the Postgres service to the `web` service, OR manually add `DATABASE_URL` to the `web` service variables.
    *   Value format: `postgresql://user:password@host:port/database` (Railway provides this).

## 3. Deployment Checklist
Use this list to verify your Railway Project Configuration matches the new `railway.toml`:

### Service: `web` (ImmigrationAI-app)
- [ ] **Root Directory**: `/` (or leaves empty)
- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `npm start`
- [ ] **Variables**:
    - `DATABASE_URL`: Linked from Postgres (Required)
    - `REDIS_URL`: Linked from Redis (Required)
    - `RAG_SERVICE_URL`: `http://rag-service.railway.internal:8000` (Use the Private Networking URL)
    - `OLLAMA_URL`: `http://ollama.railway.internal:11434`
    - `CHROMA_URL`: `http://chromadb.railway.internal:8000`
    - `NODE_ENV`: `production`

### Service: `rag-service`
- [ ] **Root Directory**: `/rag-backend`
- [ ] **Build Command**: `pip install -r requirements.txt`
- [ ] **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] **Variables**:
    - `CHROMA_URL`: `http://chromadb.railway.internal:8000`
    - `OLLAMA_URL`: `http://ollama.railway.internal:11434`

### Service: `chromadb`
- [ ] **Image**: `chromadb/chroma:latest`
- [ ] **Port**: `8000`

### Service: `ollama`
- [ ] **Image**: `ollama/ollama:latest`
- [ ] **Port**: `11434`
