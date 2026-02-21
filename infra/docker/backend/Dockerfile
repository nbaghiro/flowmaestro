# Multi-stage build for backend
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
# Includes dependencies for:
# - canvas (Cairo graphics library for chart generation)
# - General native module compilation (Python, make, g++)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    # Canvas (node-canvas) dependencies
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
COPY sdks/ai-sdk/package*.json ./sdks/ai-sdk/

# Install dependencies for all workspaces (skip scripts to avoid husky)
# Note: We skip --ignore-scripts to allow native modules to build properly
RUN npm ci --workspace=backend --workspace=shared --workspace=@flowmaestro/ai-sdk --ignore-scripts

# Rebuild native modules separately (skip @swc/core which can segfault on some platforms)
RUN npm rebuild --workspace=backend --workspace=shared --workspace=@flowmaestro/ai-sdk || true

# Copy source code
COPY shared/ ./shared/
COPY sdks/ai-sdk/ ./sdks/ai-sdk/
COPY backend/ ./backend/
COPY tsconfig.base.json ./

# Build shared package first
RUN npm run build --workspace=shared

# Build ai-sdk (required by backend)
RUN npm run build --workspace=@flowmaestro/ai-sdk

# Clean any stale build artifacts before building
RUN rm -rf backend/dist

# Build backend (increase Node memory for TypeScript compilation)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build --workspace=backend

# Production image
FROM node:22-slim

# Create non-root user early (before any file operations)
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Install runtime dependencies for native modules
# Canvas: runtime libraries (without -dev) for chart generation
# Playwright: browser dependencies for screenshot capture
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Canvas runtime dependencies
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    # Playwright/Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    # Fonts for proper text rendering
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* \
    && chown nodejs:nodejs /app

# Copy root package files (as nodejs user)
COPY --chown=nodejs:nodejs package*.json ./

# Copy workspace package files
COPY --chown=nodejs:nodejs backend/package*.json ./backend/
COPY --chown=nodejs:nodejs shared/package*.json ./shared/
COPY --chown=nodejs:nodejs sdks/ai-sdk/package*.json ./sdks/ai-sdk/

# Fix shared package.json to point to dist instead of src for production
# This must happen before npm ci so the exports resolve correctly
RUN sed -i 's|"main": "src/index.ts"|"main": "dist/index.js"|g' ./shared/package.json && \
    sed -i 's|"types": "src/index.ts"|"types": "dist/index.d.ts"|g' ./shared/package.json && \
    sed -i 's|"\.": "\./src/index\.ts"|".": "./dist/index.js"|g' ./shared/package.json

# Fix ai-sdk package.json to point to dist instead of src for production
RUN sed -i 's|"main": "src/index.ts"|"main": "dist/index.js"|g' ./sdks/ai-sdk/package.json && \
    sed -i 's|"types": "src/index.ts"|"types": "dist/index.d.ts"|g' ./sdks/ai-sdk/package.json && \
    sed -i 's|"\.": "\./src/index\.ts"|".": "./dist/index.js"|g' ./sdks/ai-sdk/package.json

# Install production dependencies only (skip prepare scripts like husky)
RUN npm ci --workspace=backend --workspace=shared --workspace=@flowmaestro/ai-sdk --omit=dev --ignore-scripts

# Rebuild native modules to ensure binaries are set up correctly
RUN npm rebuild --workspace=backend --workspace=shared --workspace=@flowmaestro/ai-sdk || true

# Set Playwright browsers path to a shared location accessible by all users
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

# Install Playwright browsers (Chromium only for screenshot capture)
# IMPORTANT: This is placed BEFORE copying built code so that code changes
# don't invalidate this expensive layer (~250MB Chromium download)
# Playwright is installed in backend/node_modules due to workspace resolution
RUN node ./backend/node_modules/playwright/cli.js install chromium || node ./node_modules/playwright/cli.js install chromium || true

# Copy built files from builder stage (as nodejs user)
# This layer changes frequently but is cheap since it's just copying files
COPY --chown=nodejs:nodejs --from=builder /app/backend/dist ./backend/dist
COPY --chown=nodejs:nodejs --from=builder /app/shared/dist ./shared/dist
COPY --chown=nodejs:nodejs --from=builder /app/sdks/ai-sdk/dist ./sdks/ai-sdk/dist

# Copy migrations
COPY --chown=nodejs:nodejs backend/migrations ./backend/migrations

# Only chown app-specific directories (not node_modules - Node.js can read root-owned files)
# This is much faster than chown -R on the entire /app directory
RUN chown -R nodejs:nodejs /app/backend /app/shared /app/sdks

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden for workers)
CMD ["node", "backend/dist/backend/src/index.js"]
