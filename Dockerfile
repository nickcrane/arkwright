# ---- Build stage ----
FROM node:22-slim AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production stage ----
FROM node:22-slim

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy production scripts
COPY scripts/ ./scripts/

# The database lives on a persistent volume mounted at /data
ENV DATABASE_PATH=/data/arkwright.db
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run migration then start the server
CMD node scripts/migrate-prod.js && node dist/index.js
