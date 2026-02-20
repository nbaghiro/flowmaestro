# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables baked into the static build
ARG VITE_API_URL="https://api.flowmaestro.ai"

WORKDIR /app

# Copy root package files and tsconfig
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace package files
COPY status/package*.json ./status/
COPY shared/package*.json ./shared/

# Install dependencies (skip scripts to avoid husky)
RUN npm ci --workspace=status --workspace=shared --ignore-scripts

# Copy source code
COPY shared/ ./shared/
COPY status/ ./status/

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}

# Build status site
RUN npm run build --workspace=status

# Production image
FROM nginx:alpine

# Copy custom nginx config
COPY infra/docker/status/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/status/dist /usr/share/nginx/html

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
