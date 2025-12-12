#!/bin/bash
# Docker entrypoint script for ImmigrationAI
# Handles startup tasks including database migrations and Ollama initialization

set -e

echo "🚀 Starting ImmigrationAI Server..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} 2>/dev/null; then
    echo "✅ Database is ready!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Database failed to start"
    exit 1
  fi
  
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
  attempt=$((attempt + 1))
done

# Run database migrations
echo ""
echo "🔄 Running database migrations..."
npm run migrate || {
  echo "⚠️  Migration warning (may already be applied)"
}

# Initialize Ollama in background while app starts
if [ -z "$SKIP_OLLAMA_INIT" ]; then
  echo ""
  echo "🤖 Initializing Ollama AI model..."
  
  # Check if LOCAL_AI_URL is set
  if [ -n "$LOCAL_AI_URL" ]; then
    # Run initialization in background to not block app startup
    bash /app/scripts/init-ollama.sh &
    INIT_PID=$!
    
    # Give it a few seconds to start, but don't wait forever
    sleep 5
    
    if kill -0 $INIT_PID 2>/dev/null; then
      echo "  (Ollama initialization running in background)"
    fi
  else
    echo "  ⚠️  LOCAL_AI_URL not set - Ollama will not be initialized"
  fi
fi

# Start the main application
echo ""
echo "✨ Starting application server on port $PORT..."
exec "$@"
