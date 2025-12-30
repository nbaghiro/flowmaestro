# Multi-stage build for backend
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies for both workspaces (skip scripts to avoid husky)
# Note: We skip --ignore-scripts to allow native modules to build properly
RUN npm ci --workspace=backend --workspace=shared --ignore-scripts

# Rebuild native modules separately (skip @swc/core which can segfault on some platforms)
RUN npm rebuild --workspace=backend --workspace=shared || true

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY tsconfig.base.json ./

# Build shared package first
RUN npm run build --workspace=shared

# Clean any stale build artifacts before building
RUN rm -rf backend/dist

# Build backend
RUN npm run build --workspace=backend

# Production image
FROM node:22-slim

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Copy built files from builder stage first (before npm install)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Fix shared package.json to point to dist instead of src for production
RUN sed -i 's|"main": "src/index.ts"|"main": "dist/index.js"|g' ./shared/package.json && \
    sed -i 's|"types": "src/index.ts"|"types": "dist/index.d.ts"|g' ./shared/package.json && \
    sed -i 's|"\.": "\./src/index\.ts"|".": "./dist/index.js"|g' ./shared/package.json

# Install production dependencies only (skip prepare scripts like husky)
RUN npm ci --workspace=backend --workspace=shared --omit=dev --ignore-scripts

# Copy migrations
COPY backend/migrations ./backend/migrations

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden for workers)
CMD ["node", "backend/dist/backend/src/index.js"]
