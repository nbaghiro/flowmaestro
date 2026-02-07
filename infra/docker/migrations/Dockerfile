# Lightweight migrations and seeding image
# Includes devDependencies needed for migrations (node-pg-migrate, tsx)
FROM node:24-slim

# Install PostgreSQL client for schema creation
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files for workspaces
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install ALL dependencies including devDependencies (for node-pg-migrate, tsx, etc.)
# Use --ignore-scripts to skip husky and other unnecessary scripts
RUN npm ci --workspace=backend --workspace=shared --ignore-scripts

# Copy migration files
COPY backend/migrations ./backend/migrations

# Copy seed scripts
COPY backend/scripts ./backend/scripts

# Copy shared source (needed for building if seed scripts use shared types)
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY tsconfig.base.json ./

# Build shared package (seed scripts may import from it)
RUN npm run build --workspace=shared

# Create non-root user for security
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Default command runs migrations
CMD ["npx", "node-pg-migrate", "up", \
     "--migrations-table", "flowmaestro.pgmigrations", \
     "--schema", "flowmaestro", \
     "--database-url-var", "DATABASE_URL", \
     "--migrations-dir", "backend/migrations"]
