# Railway Deployment Checklist — rag-backend

This checklist describes required Railway configuration to run the `rag-backend` FastAPI microservice and integrate it with the main app.

1. Service & Build
- Create a Railway service using the `rag-backend` directory as the project root (set `root_dir=rag-backend`).
- Ensure `rag-backend/scripts/entrypoint.sh` and `rag-backend/scripts/init-ollama.sh` are present in repo (they are required by the Dockerfile/runtime).
- Dockerfile: `rag-backend/Dockerfile` exposes port `8000`.

2. Persistent Volume
- Create a persistent volume and mount it at `/app/vector_store` in the `rag-backend` service. This stores ChromaDB vectors.
- Recommended size: at least 1GB for initial usage; increase as ingest grows.

3. Environment Variables (rag-backend)
- No secret token is strictly required by default, but set the following if you use external providers:
  - `BACKEND_URL` — Optional: URL of the main backend if the scheduler needs to call back.
  - `VECTOR_STORE_PATH` — Optional override for vector store path (default: `/app/vector_store`).

4. Environment Variables (main app integration)
- In the main app service (ImmigrationAI backend), set:
  - `RAG_SERVICE_URL` — URL of the deployed rag-backend, include protocol, e.g., `https://rag-backend.up.railway.app` or internal Railway hostname `http://rag-backend.railway.internal:8000`.
  - `LOCAL_AI_URL` — (optional) URL of Ollama if using local Ollama for generation, e.g., `http://ollama:11434/api/generate`.
  - `OLLAMA_MODEL` — (optional) model name to use with Ollama (recommended: `neural-chat` or `mistral`).
  - `HUGGINGFACE_API_TOKEN` — (optional) Hugging Face token for HF fallback.
  - `HF_MODEL` — (optional) HF Hub model id for fallback, e.g., `mistralai/Mistral-7B-Instruct-v0.2` or a smaller model for inference cost control.
  - `HF_INFERENCE_URL` — (optional) self-hosted HuggingFace Text-Generation-Inference URL.

5. Ollama (optional, recommended for low-latency local inference)
- Add a separate Railway service for Ollama (if you want a local inference provider):
  - Image: use Ollama's official image or a Railway-compatible container.
  - Ports: expose `11434` for API access.
  - Mount a volume for model storage and set appropriate memory/CPU plan.
  - Set `LOCAL_AI_URL` in main app to `http://ollama:11434` (the code will append `/api/generate` when needed).
- Alternatively, use a small self-hosted TGI or HuggingFace inference instance and set `HF_INFERENCE_URL`.

6. Health Checks & Probes
- Railway will report service health by probing `http://<service>:8000/health`. The `rag-backend` service provides `/health` which reports `vector_store_present` and `model_loaded`.
- The main app also probes `LOCAL_AI_URL` on startup — ensure `LOCAL_AI_URL` or `HUGGINGFACE_API_TOKEN`+`HF_MODEL` are set to avoid startup warnings.

7. Build Context Fixes
- If Railway builds the `rag-backend` service from the subdirectory, ensure the `rag-backend` folder contains the required `scripts/` used by the Dockerfile. (A known fix is to copy `scripts/entrypoint.sh` and `scripts/init-ollama.sh` into `rag-backend/scripts/`).

8. Post-deploy Checklist
- After deployment, record the rag-backend URL and add it to the main app `RAG_SERVICE_URL` variable.
- Verify `/health` returns `status: healthy` and both `vector_store_present: true` and `model_loaded: true` (model_loaded may be `false` if CPU model couldn't load — still acceptable but indicates degraded performance).
- Run `rag-backend/tests.py` or manual curl tests to verify `/ingest`, `/search`, `/answer`.

9. Troubleshooting
- If the rag-backend build fails due to missing scripts, copy the root `scripts/` content into `rag-backend/scripts/` and retry.
- If `vector_store` directory is not writable, check volume mount permissions.
- If model fails to load on CPU, consider switching to a smaller model or using a GPU-enabled Railway plan (if available) or use Ollama/HF inference as fallback.

---

If you want, I can also add a tiny CI step (`.github/workflows/rag-backend-ci.yml`) to build and run `rag-backend/tests.py` on PRs to validate the service before deploying.