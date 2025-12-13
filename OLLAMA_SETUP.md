# Ollama + Llama Local AI Setup Guide

## Overview
This guide explains how to set up **Ollama** with **Llama 2** or other models for completely local, private AI processing without any API costs or external dependencies.

All AI features in ImmigrationAI work with local Ollama:
- ✅ Document Generation (immigration letters, affidavits, etc.)
- ✅ AI Chat & Consultation
- ✅ Text Translation (English ↔ Uzbek, Russian, etc.)
- ✅ Interview Question Generation
- ✅ Eligibility Analysis
- ✅ Document Analysis

---

## Prerequisites
- **RAM**: 8GB minimum (16GB+ recommended for faster inference)
- **Storage**: ~10GB per model (Llama 2 7B is ~4GB)
- **CPU/GPU**: Any modern CPU works; GPU (NVIDIA/AMD) speeds up inference 10-50x

---

## Step 1: Install Ollama

### macOS
```bash
# Download from https://ollama.ai or use Homebrew
brew install ollama
```

### Linux
```bash
curl https://ollama.ai/install.sh | sh
```

### Windows
1. Download installer from https://ollama.ai
2. Run the installer
3. Ollama will be available as a service (accessible via http://localhost:11434)

---

## Step 2: Pull a Model

Start with **Mistral 7B** (fast, good at tasks) or **Llama 2 7B** (well-tested):

```bash
# Recommended for immigration AI tasks
ollama pull mistral

# Alternative: Llama 2 (more capable, slower)
ollama pull llama2

# Alternative: Neural Chat (good for conversational AI)
ollama pull neural-chat

# Optional: Specialized models
ollama pull orca-mini      # Smaller, faster
ollama pull dolphin-mixtral # More capable, larger
```

**Model comparison for your use case:**

| Model | Size | Speed | Quality | RAM | Best For |
|-------|------|-------|---------|-----|----------|
| mistral | 4GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | 8GB | Balanced - Recommended |
| llama2 | 4GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | 8GB | Better quality, slower |
| neural-chat | 4GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | 8GB | Chat/conversation |
| orca-mini | 2GB | ⚡⚡⚡⚡ | ⭐⭐⭐ | 4GB | Fast, lightweight |

---

## Step 3: Start Ollama

```bash
# Start the Ollama server
ollama serve

# Output will show:
# 2024/12/11 14:30:45 "Ollama is running on http://127.0.0.1:11434"
```

Leave this running in a terminal. The API will be accessible at `http://localhost:11434`

---

## Step 4: Configure ImmigrationAI

### For Local Development

Update `.env`:
```dotenv
# Use Ollama as the primary AI provider
LOCAL_AI_URL=http://localhost:11434/api/generate

# Leave OpenAI and HuggingFace empty (they're fallbacks)
OPENAI_API_KEY=
HUGGINGFACE_API_TOKEN=
```

### For Docker/Production on Railway

In Railway environment variables:
```
LOCAL_AI_URL=http://localhost:11434/api/generate
```

Or if Ollama runs in a separate Docker service:
```
LOCAL_AI_URL=http://ollama-service:11434/api/generate
```

---

## Step 5: Test the Setup

### Using curl:
```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "What are the main visa types for immigration to the EU?",
    "stream": false
  }'
```

### Using the ImmigrationAI API:
```bash
# Start your server
npm run dev

# Test an AI endpoint
curl http://localhost:5000/api/ai/eligibility/questions
```

You should get a response from Ollama (check the server logs for confirmation).

---

## Step 6: Customize Model Settings (Optional)

### Use a faster/lighter model:
```bash
# In .env, you can specify the model in the prompt
# Currently the code uses whatever you pulled last, 
# or you can modify server/lib/agents.ts to specify OLLAMA_MODEL env var
```

### Optimize Ollama for performance:
```bash
# Run with GPU support (if available)
# For NVIDIA GPU:
ollama serve --gpu

# Check Ollama performance:
# Monitor memory/CPU usage while requests are processing
```

### Batch requests for faster processing:
The code already handles concurrent requests efficiently. Heavy usage (1000+ requests/day) may require:
- More RAM
- A more powerful GPU
- Model quantization (lower precision = faster)

---

## Troubleshooting

### "Connection refused" error
```bash
# Ensure Ollama is running
ollama serve

# Verify it's accessible
curl http://localhost:11434/api/tags
```

### Model takes too long to respond
- Switch to a smaller model: `ollama pull orca-mini`
- Increase system RAM
- Use a GPU if available
- Reduce prompt length

### Out of memory errors
- Use a smaller model (orca-mini, neural-chat)
- Reduce max_tokens in requests
- Increase system swap

### Model not found
```bash
# List available models
ollama list

# Pull a model
ollama pull mistral
```

---

## Monitoring & Logs

### Check Ollama service health:
```bash
# List loaded models
ollama list

# Check status
curl http://localhost:11434/api/tags
```

### Monitor resource usage:
```bash
# macOS/Linux
top -p $(pgrep -f "ollama")

# Windows (PowerShell)
Get-Process ollama | Select-Object Name, WorkingSet, Handles
```

---

## Scaling to Production (Railway)

### Option 1: Ollama Container + App Container
Create a separate Ollama service in Railway:
```yaml
# docker-compose.yml addition
ollama-service:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama
  environment:
    - OLLAMA_MODELS=/root/.ollama/models

volumes:
  ollama-data:
```

Set `LOCAL_AI_URL=http://ollama-service:11434/api/generate` in app env vars.

### Option 2: Cloud GPU Service (Alternative)
If local Ollama is too slow/heavy:
- **Replicate**: API for running open-source models
- **Together.ai**: Open-source model inference
- **Hugging Face Inference**: Free tier available

---

## Advanced: Custom Models

You can fine-tune Ollama models for immigration law specific tasks:

```bash
# Create a Modelfile
cat > Modelfile << 'EOF'
FROM mistral
SYSTEM """You are an expert immigration law assistant specializing in EU/UK/Poland immigration policy..."""
PARAMETER temperature 0.5
PARAMETER top_k 40
EOF

# Build custom model
ollama create immigration-expert -f Modelfile

# Use in ImmigrationAI (would require code change to specify model)
```

---

## Cost Comparison

| Solution | Monthly Cost | Privacy | Latency |
|----------|--------------|---------|---------|
| **Local Ollama** | $0 | 100% private | 1-5s |
| OpenAI API | $20-100+ | Data sent to OpenAI | 0.5-2s |
| HuggingFace | $0-100+ | Depends | 2-10s |

**Local Ollama wins** on cost and privacy. Speed depends on hardware.

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull a model (mistral or llama2)
3. ✅ Start `ollama serve`
4. ✅ Update `.env` with `LOCAL_AI_URL=http://localhost:11434/api/generate`
5. ✅ Restart your app server
6. ✅ Test AI features

Questions? Check Ollama docs: https://ollama.ai/docs
