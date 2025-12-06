#!/bin/bash

# ImmigrationAI Railway Deployment Setup Script

set -e

echo "🚀 ImmigrationAI Railway Deployment Setup"
echo "=========================================="

# Generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 32)
  echo "✅ Generated JWT_SECRET"
fi

if [ -z "$REFRESH_SECRET" ]; then
  REFRESH_SECRET=$(openssl rand -base64 32)
  echo "✅ Generated REFRESH_SECRET"
fi

# Create .env file for Railway
cat > .env.railway << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
JWT_SECRET=$JWT_SECRET
REFRESH_SECRET=$REFRESH_SECRET
LOG_LEVEL=info
ALLOWED_ORIGINS=https://\${RAILWAY_STATIC_URL}
APP_URL=https://\${RAILWAY_STATIC_URL}
API_URL=https://\${RAILWAY_STATIC_URL}/api
VITE_API_URL=https://\${RAILWAY_STATIC_URL}/api
EOF

echo "✅ Created .env.railway"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps

# Build project
echo "🔨 Building project..."
npm run build

# Run migrations
echo "🗄️ Running database migrations..."
npm run db:migrate || echo "⚠️ Migrations may have issues - check database"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps for Railway deployment:"
echo "1. Push to GitHub"
echo "2. Connect GitHub repo to Railway"
echo "3. Add PostgreSQL plugin"
echo "4. Add Redis plugin"
echo "5. Set these environment variables in Railway:"
echo "   - JWT_SECRET=$JWT_SECRET"
echo "   - REFRESH_SECRET=$REFRESH_SECRET"
echo "   - DATABASE_URL (auto from PostgreSQL)"
echo "   - REDIS_URL (auto from Redis)"
echo "   - ALLOWED_ORIGINS"
echo "   - OPENAI_API_KEY"
echo "   - SMTP_* variables"
echo ""
echo "6. Deploy!"