# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY sdks/widget/package*.json ./sdks/widget/

# Install dependencies (skip scripts to avoid husky)
RUN npm ci --workspace=@flowmaestro/widget --ignore-scripts && \
    npm rebuild --workspace=@flowmaestro/widget

# Copy source code
COPY sdks/widget/ ./sdks/widget/
COPY tsconfig.base.json ./

# Build widget SDK
RUN npm run build --workspace=@flowmaestro/widget

# Production image
FROM nginx:alpine

# Copy custom nginx config
COPY infra/docker/static/nginx.conf /etc/nginx/conf.d/default.conf

# Create widget directory
RUN mkdir -p /usr/share/nginx/html/widget

# Copy built widget file
# The widget.js serves the same IIFE bundle for all slugs - the slug is extracted from the URL
COPY --from=builder /app/sdks/widget/dist/auto-init.global.js /usr/share/nginx/html/widget/widget.js

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
