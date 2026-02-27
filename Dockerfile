FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build TypeScript
RUN npm run build

# The database lives on a persistent volume mounted at /data
ENV DATABASE_PATH=/data/arkwright.db
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run migration then start the server
CMD node scripts/migrate-prod.js && node dist/index.js
