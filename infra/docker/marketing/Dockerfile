# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables baked into the static build
ARG VITE_GA_MEASUREMENT_ID=""
ARG VITE_APP_URL="https://app.flowmaestro.ai"
ARG VITE_DOCS_URL="https://docs.flowmaestro.ai"

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

# Copy root package files and tsconfig
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace package files
COPY marketing/package*.json ./marketing/
COPY shared/package*.json ./shared/

# Install dependencies (skip scripts to avoid husky)
RUN npm ci --workspace=marketing --workspace=shared --ignore-scripts && \
    npm rebuild --workspace=marketing --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY marketing/ ./marketing/

# Set environment variables for build
ENV VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV VITE_DOCS_URL=${VITE_DOCS_URL}

# Build marketing site
RUN npm run build --workspace=marketing

# Production image
FROM nginx:alpine

# Copy custom nginx config
COPY infra/docker/marketing/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/marketing/dist /usr/share/nginx/html

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
