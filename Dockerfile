# =====================================================================
# Multi-stage Dockerfile for EduProof (frontend + backend)
# =====================================================================
FROM node:20-alpine AS base

# --- Frontend Build ---
FROM base AS frontend-builder
WORKDIR /app/frontend

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Copy metadata (needed by build)
COPY metadata.json ./src/metadata.json

# Build frontend
RUN NODE_ENV=production pnpm run build

# --- Server Build ---
FROM base AS server-builder
WORKDIR /app/server

COPY server/package.json server/pnpm-lock.yaml* ./
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

COPY server/ ./
RUN pnpm run build

# --- Production Frontend ---
FROM nginx:alpine AS frontend-prod
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# --- Production Server ---
FROM base AS server-prod
WORKDIR /app/server

COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY server/.env.server.example ./.env.example

EXPOSE 3001

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
