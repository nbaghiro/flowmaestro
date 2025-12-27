-- FlowMaestro Local Development Database Initialization
-- This script sets up the PostgreSQL database for local Docker Compose development

-- Enable pgvector extension for vector embeddings (knowledge base)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create Trigger.dev database (for self-hosted Trigger.dev workflow engine)
CREATE DATABASE trigger;

-- Grant permissions to flowmaestro user
GRANT ALL PRIVILEGES ON DATABASE flowmaestro TO flowmaestro;
GRANT ALL PRIVILEGES ON DATABASE trigger TO flowmaestro;

-- Switch to flowmaestro database and ensure vector extension is available
\c flowmaestro;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create flowmaestro schema (required by migrations)
CREATE SCHEMA IF NOT EXISTS flowmaestro;
GRANT ALL PRIVILEGES ON SCHEMA flowmaestro TO flowmaestro;

-- Ensure timezone defaults to UTC for sessions
ALTER DATABASE flowmaestro SET timezone TO 'UTC';
ALTER ROLE flowmaestro SET timezone TO 'UTC';

-- Note: Application migrations will be run separately via npm run db:migrate
-- This init script only sets up extensions, databases, and schemas
