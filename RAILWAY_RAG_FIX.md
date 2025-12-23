# Railway Deployment Guide for RAG Microservice

Since we've introduced a Python/FastAPI microservice alongside the Node.js application, you need to configure Railway to handle both.

## 1. Deploy the RAG Backend as a New Service
1.  **Create a New Service**: In your Railway Project, click `+ New` -> `GitHub Repo` -> Select `ImmigrationAI-app`.
2.  **Rename Service**: Name it `rag-backend`.
3.  **Update Root Directory**: 
    - Go to **Settings** -> **General**.
    - Set the **Root Directory** to `/rag-backend`.
4.  **Builder**: Railway will automatically detect the `Dockerfile` inside the `/rag-backend` folder.

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
