Local AI (TGI / Ollama) — Setup & env vars

This guide shows two recommended local options to provide LLM inference for the app:
- Text-Generation-Inference (TGI) container (recommended for HF/TGI-compatible models)
- Ollama (local inference server providing /api/generate endpoint)

Prerequisites
- Docker installed (Docker Desktop on Windows)
- Sufficient disk space for model weights (varies by model: 7B ~ 20-30GB, 13B+, 70B much larger)
- Optional GPU (recommended) for reasonable speed with larger models

1) Option A — Run Hugging Face Text-Generation-Inference (TGI)

Overview:
- TGI runs a REST API compatible with many model flavors. We'll run the official container and mount a local model folder.

Files added:
- `docker-compose.tgi.yml` — runs TGI exposing port 8080 and mounting `./models` into the container.

Steps:
1. Pull or download a model into `./models/<MODEL_FOLDER>`.
   - If you already have a model folder (exported in HF "transformers" layout or TGI-ready folder), place it under `./models`.
   - Alternatively, use the HF Hub to download the model inside container (requires HF token). For large models prefer downloading once outside the container.

2. Configure environment variables for the app (server):
   - If TGI runs locally and your server runs on the host, set these env vars for the app:
     - `HF_INFERENCE_URL` = `http://host.docker.internal:8080` (Windows) or `http://localhost:8080` (Linux/Mac)
     - `HF_MODEL` = `<MODEL_FOLDER>` (optional; used only for display; TGI will load the model you provided at container start)
     - `HUGGINGFACE_API_TOKEN` = `<your_hf_token>` (optional; only needed if the container must download private models from HF Hub)
   - Example `.env` snippet:
     HF_INFERENCE_URL=http://host.docker.internal:8080
     HF_MODEL=<MODEL_FOLDER>
     HUGGINGFACE_API_TOKEN=hf_xxx

3. Start TGI:
```pwsh
# from repo root
docker compose -f docker-compose.tgi.yml up --pull always
```

4. Test the endpoint (from host):
```pwsh
# Basic test
curl -X POST "http://localhost:8080/generate" -H "Content-Type: application/json" -d '{"inputs":"Hello world","parameters":{"max_new_tokens":32}}'
```

5. Configure app to use TGI:
- If you set `HF_INFERENCE_URL` above, the backend `server/lib/agents.ts` will attempt to call the HF/TGI endpoint.
- Alternatively set `LOCAL_AI_URL` to the TGI `generate` endpoint (e.g. `http://host.docker.internal:8080/generate`) — this triggers the code path that prefers local servers.

Notes & tips:
- Model compatibility: some models require text-generation-inference-compatible format. If you get parsing errors, check the model loader docs.
- GPU: to enable GPU in Docker, use the `--gpus` option and ensure drivers are installed. See TGI docs for GPU flags.

2) Option B — Ollama (alternative local server)

Overview:
- Ollama provides an easy local experience with `http://localhost:11434/api/generate` endpoints.
- You can install Ollama on your machine (https://ollama.com/docs) or run a container if available.

Usage:
- Run Ollama (OS install per docs) and load a model into Ollama:
  - `ollama pull <model>` (e.g., `ollama pull llama2` if available under their distribution)
- Set app env vars:
  - `LOCAL_AI_URL=http://localhost:11434/api/generate`
  - (optional) `HUGGINGFACE_API_TOKEN` if you also plan to use HF as fallback

Test:
```pwsh
$body = @{ model = "<model-name>"; prompt = "Hello" } | ConvertTo-Json
curl -X POST "http://localhost:11434/api/generate" -H "Content-Type: application/json" -d $body
```

Railway / Deployment notes
- For Railway you'll usually use a cloud provider for inference (HF Inference API) or a dedicated model host; running large models in Railway is not recommended.
- Env vars to set in Railway project:
  - `STRIPE_SECRET_KEY` (Stripe key)
  - `HUGGINGFACE_API_TOKEN` (if using HF hosted inference)
  - `HF_MODEL` (model id)
  - `HF_INFERENCE_URL` (if you have a custom TGI endpoint)
  - `LOCAL_AI_URL` (if you have a reachable local/external inference endpoint)

Security
- Never commit secrets to Git. Use Railway variables or secret store.
- For local testing you can use `.env` (gitignored) or your shell session.

If you'd like, I can:
- Add a `docker-compose` service for the server and Postgres for a local full-stack dev compose file.
- Create a small helper script to download a specific HF model and prepare a local `./models` folder.
- Add a Railway-friendly README or an automated script to set required Railway env vars using the existing `tools/deploy/railway_set_env.ps1`.

