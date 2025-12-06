# Serve the fine-tuned model locally (Text-Generation-Inference)

This document shows how to run a local inference server using Hugging Face's Text-Generation-Inference (TGI) container and how to prepare a merged model (base + LoRA adapter) for serving.

Prerequisites
- Docker (with GPU support if you plan to run large models). For GPU: NVIDIA drivers + Docker GPU runtime.
- Enough disk space to store the model (varies by model — several GBs to tens of GBs).
- Optionally a Hugging Face token with inference permission if you load models from the Hub.

Files
- `docker-compose.tgi.yml` — compose file to run the TGI container, exposes port 8080.
- `merge_lora.py` — helper to merge a LoRA adapter into a base model and save the merged model locally for TGI to load.

Environment variables
- `HF_MODEL` — (optional) the HF Hub model id to load (e.g. `username/mymodel`). If left empty, mount `./models/<model-id>` locally and set `MODEL_ID` accordingly.
- `HUGGINGFACE_API_TOKEN` — token for private models or to speed hub downloads.
- `HF_INFERENCE_URL` — (not used here) for self-hosted custom endpoints.

Start the server
1. Make sure `docker` is installed and running.
2. Export or set environment variables (example):

```bash
export HUGGINGFACE_API_TOKEN="hf_xxx"
export HF_MODEL="gpt-j-6b"
```

3. Launch with docker-compose:

```bash
docker compose -f tools/llm_finetune/docker-compose.tgi.yml up -d
```

4. The inference API will be available at `http://localhost:8080`.

Test the server with curl
```bash
curl -s -X POST "http://localhost:8080/v1/models/${HF_MODEL}:predict" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"Hello, translate to French: How are you?","parameters":{"max_new_tokens":50}}'
```

If you get a response, the server is running.

Preparing a merged model from a LoRA adapter
TGI currently best loads a single Hugging Face-style model folder. If you trained a LoRA adapter, merge it into the base model and save the merged model to disk, then mount it at `./models/<model-id>` and set `MODEL_ID`.

Example (uses `merge_lora.py`):

```bash
python tools/llm_finetune/merge_lora.py \
  --base_model "mistralai/Mistral-7B-Instruct" \
  --adapter_dir "output/lora-mistral-7b" \
  --output_dir "models/mistral-mistral-lora-merged"
```

Notes & tips
- For production, set up monitoring and tune `max_length`/`batch_size` to your expected workload.
- If you host TGI behind a reverse proxy, set proper timeouts (inference can take seconds for large models).
- If you cannot provide a GPU, use smaller models (1–3B) or use HF hosted Inference API.
