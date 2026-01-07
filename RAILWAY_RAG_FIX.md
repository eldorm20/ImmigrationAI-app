# Railway Deployment Guide for RAG Microservice

Since we've introduced a Python/FastAPI microservice alongside the Node.js application, you need to configure Railway to handle both.
# Railway RAG Backend Fix - RESOLVED ✅

## Issue
Railway build was failing for the `rag-backend` service with the error:
```
Build Failed: failed to solve: failed to compute cache key:
"/scripts/init-ollama.sh": not found
```

## Root Cause
The root `Dockerfile` (line 53) attempts to copy scripts:
```dockerfile
COPY scripts/entrypoint.sh scripts/init-ollama.sh ./scripts/
```

Railway was building from the `rag-backend` subdirectory context (as shown by `root_dir=rag-backend` in the build logs). When building from this context, the Dockerfile couldn't find the scripts because they only existed in the parent directory's `scripts/` folder.

## Solution Applied
Created a `scripts/` directory inside `rag-backend/` and copied the required scripts:
- ✅ Created `rag-backend/scripts/` directory
- ✅ Copied `entrypoint.sh` from `scripts/` to `rag-backend/scripts/`
- ✅ Copied `init-ollama.sh` from `scripts/` to `rag-backend/scripts/`

## Changes Committed
```
Commit: a584a7d
Message: "Fix: Add missing scripts to rag-backend for Railway build"
Files: 2 files changed, 142 insertions(+)
  - rag-backend/scripts/entrypoint.sh
  - rag-backend/scripts/init-ollama.sh
```

## Status
- ✅ Fix implemented
- ✅ Changes committed and pushed to GitHub
- 🔄 Railway rebuild should trigger automatically
- ⏳ Waiting for Railway deployment verification

## Next Steps
Monitor the Railway deployment logs to confirm the build succeeds.

## Timeline
- Started: Dec 23, 2025 4:40 PM
- Fixed: Dec 23, 2025 4:47 PM
- Duration: ~7 minutes`Dockerfile` inside the `/rag-backend` folder.


## 2. Persist ChromaDB Data (CRITICAL)
Railway's file system is ephemeral. To prevent losing your indexed laws and scraped data:
1.  **Add a Volume**:
    - In the `rag-backend` service, go to **Settings** -> **Volumes**.
    - Create a volume and mount it to `/app/chroma_db`.
    - This ensures `ChromaDB` data survives deployments and resets.

## 3. Wire the Main App to the RAG Service
1.  **Get RAG URL**: Once the `rag-backend` is deployed, Railway will provide an internal URL (e.g., `rag-backend.railway.internal`) or a public one.
2.  **Add Environment Variable**:
    - Go to your **Main Application** service (the Node.js one).
    - Go to **Variables**.
    - Add `RAG_SERVICE_URL` with the value of your `rag-backend` URL (include `http://`).

## 4. Environment Variables Checklist
Ensure these are set in your Railway project:

| Variable | Service | Description |
|----------|---------|-------------|
| `RAG_SERVICE_URL` | Main App | The URL of the FastAPI service |
| `OPENAI_API_KEY` | Both | Required for RAG embeddings and generation |
| `UK_GOV_API_KEY` | Main App | For Companies House & RTW checks |
| `HOME_OFFICE_API_KEY` | Main App | For Visa status checks |

## 5. Automatic Deploy-Trigger
The root directory contains a `.railway-deploy-trigger` file. Any push to `main` will trigger a rebuild of both services if configured to track the same branch.
