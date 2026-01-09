#!/bin/bash

# Ollama Model Auto-Initialization Script
# Automatically pulls and initializes Ollama models on startup
# Works in Docker/Railway environments

set -e

OLLAMA_URL="${LOCAL_AI_URL:-${OLLAMA_URL:-http://localhost:11434}}"
# Use OLLAMA_MODEL or default to mistral
MODEL="${OLLAMA_MODEL:-mistral}"
MAX_WAIT=300  # 5 minutes max wait for Ollama to be ready

echo "🤖 ImmigrationAI - Ollama AI Setup"
echo "=================================="
echo "Config: MODEL=$MODEL, URL=$OLLAMA_URL"
echo "Waiting for Ollama to be ready..."

# Wait for Ollama to be accessible
WAITED=0
while ! curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ Ollama did not start or is not reachable at $OLLAMA_URL within $MAX_WAIT seconds"
    echo "Current environment:"
    env | grep -E "OLLAMA|LOCAL_AI" || true
    exit 1
  fi
  
  WAITED=$((WAITED + 5))
  echo "  ⏳ Waiting for endpoint... ($WAITED/$MAX_WAIT seconds)"
  sleep 5
done

echo "✅ Ollama endpoint is reachable!"

# Check if model is already pulled
echo ""
echo "Checking if model '$MODEL' is already pulled..."

# Improved check: look for model name without strict quoting for tags
TAGS_RESPONSE=$(curl -s "$OLLAMA_URL/api/tags" || echo '{"models":[]}')
MODEL_CHECK=$(echo "$TAGS_RESPONSE" | grep -i "\"name\":\"$MODEL" || true)

if [ -n "$MODEL_CHECK" ]; then
  echo "✅ Model '$MODEL' is already available."
else
  echo "📥 Pulling model '$MODEL' (this may take a few minutes)..."
  echo "Request: POST $OLLAMA_URL/api/pull"
  
  # Pull the model
  PULL_RESULT=$(curl -s -X POST "$OLLAMA_URL/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" || echo "FAILED")
  
  if [[ "$PULL_RESULT" == *"status"* ]] || [[ "$PULL_RESULT" == *"success"* ]]; then
    echo "✅ Pull request accepted. Model '$MODEL' is being downloaded."
  elif [[ "$PULL_RESULT" == "FAILED" ]]; then
    echo "❌ Failed to connect to Ollama to pull model."
    exit 1
  else
    echo "⚠️  Unexpected pull response: $PULL_RESULT"
  fi
fi

# Verify model is accessible (it might take a while to finish pulling, so we don't exit 1 here)
echo ""
echo "Verifying model accessibility..."

TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"$MODEL\", \"prompt\": \"health check\", \"stream\": false}" || echo "000")

if [ "$TEST_RESPONSE" = "200" ]; then
  echo "✅ Model is ready and responding!"
else
  echo "ℹ️  Model status check: $TEST_RESPONSE (Note: Might be downloading if pull was just triggered)"
fi

echo ""
echo "=================================="
echo "🎉 Ollama initialization script finished"
echo "=================================="
echo ""
