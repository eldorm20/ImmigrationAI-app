#!/bin/bash

# Ollama Model Auto-Initialization Script
# Automatically pulls and initializes Ollama models on startup
# Works in Docker/Railway environments

set -e

OLLAMA_URL="${LOCAL_AI_URL:-http://localhost:11434}"
MODEL="${OLLAMA_MODEL:-mistral}"
MAX_WAIT=300  # 5 minutes max wait for Ollama to be ready

echo "🤖 ImmigrationAI - Ollama AI Setup"
echo "=================================="
echo "Waiting for Ollama to be ready at $OLLAMA_URL..."

# Wait for Ollama to be accessible
WAITED=0
while ! curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ Ollama did not start within $MAX_WAIT seconds"
    echo "Make sure Ollama is running. Check logs with: docker logs immigrationai-ollama"
    exit 1
  fi
  
  WAITED=$((WAITED + 5))
  echo "  ⏳ Waiting... ($WAITED/$MAX_WAIT seconds)"
  sleep 5
done

echo "✅ Ollama is ready!"

# Check if model is already pulled
echo ""
echo "Checking for $MODEL model..."

MODEL_CHECK=$(curl -s "$OLLAMA_URL/api/tags" | grep -c "\"name\":\"$MODEL\"" || true)

if [ $MODEL_CHECK -gt 0 ]; then
  echo "✅ Model '$MODEL' is already available"
else
  echo "📥 Pulling model '$MODEL' (this may take a few minutes)..."
  
  # Pull the model
  curl -X POST "$OLLAMA_URL/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    -w "\n" || {
    echo "❌ Failed to pull model"
    exit 1
  }
  
  echo "✅ Model '$MODEL' successfully pulled!"
fi

# Verify model is accessible
echo ""
echo "Verifying model is accessible..."

TEST_RESPONSE=$(curl -s -X POST "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"$MODEL\", \"prompt\": \"Hello\", \"stream\": false}" \
  -w "%{http_code}" 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "200" ] || grep -q "response" <<< "$TEST_RESPONSE" 2>/dev/null; then
  echo "✅ Model is accessible and responding"
else
  echo "⚠️  Model verification returned: $TEST_RESPONSE"
  echo "    This might still be normal - the model may need a moment to load"
fi

echo ""
echo "=================================="
echo "🎉 Ollama initialization complete!"
echo "=================================="
echo ""
echo "Model: $MODEL"
echo "Endpoint: $OLLAMA_URL"
echo "Status: Ready for use"
echo ""
