# Builder stage (use Debian slim to avoid Docker Hub Alpine layer transient errors)
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Install native build dependencies required by node-gyp/argon2 on Debian
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    pkg-config \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies and build the project
COPY package*.json tsconfig.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build   # uses your updated package.json to build server + client

# Production stage

FROM node:20-bullseye-slim AS production
WORKDIR /app

# Bring runtime dependencies from the builder to avoid rebuilding native modules
COPY package*.json tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built server and frontend
# Vite outputs client build into /app/dist/public; copy that to /app/client/dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/public ./client/dist

COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/shared ./shared

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 5000; require('http').get(`http://localhost:${port}/health`, (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "dist/index.cjs"]
