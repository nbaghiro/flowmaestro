# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pkgconfig

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies for both workspaces (skip scripts to avoid husky)
RUN npm ci --workspace=frontend --workspace=shared --ignore-scripts && \
    npm rebuild --workspace=frontend --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY tsconfig.base.json ./

# Build arguments for frontend configuration
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_UNSPLASH_ACCESS_KEY

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_UNSPLASH_ACCESS_KEY=$VITE_UNSPLASH_ACCESS_KEY

# Build shared package first
RUN npm run build --workspace=shared

# Build frontend
RUN npm run build --workspace=frontend

# Production image
FROM nginx:alpine

# Copy custom nginx config
COPY infra/docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Create non-root user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
