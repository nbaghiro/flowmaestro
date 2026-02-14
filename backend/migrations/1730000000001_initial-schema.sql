-- Migration: Initial Schema
-- Created: 2024-10-27
-- Description: Create base tables for FlowMaestro (users, workflows, executions)

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS flowmaestro;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (must be first due to foreign key dependencies)
CREATE TABLE IF NOT EXISTS flowmaestro.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS flowmaestro.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    user_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create executions table
CREATE TABLE IF NOT EXISTS flowmaestro.executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inputs JSONB,
    outputs JSONB,
    current_state JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create execution_logs table
CREATE TABLE IF NOT EXISTS flowmaestro.execution_logs (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES flowmaestro.executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON flowmaestro.users(email);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON flowmaestro.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON flowmaestro.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_definition ON flowmaestro.workflows USING GIN(definition);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON flowmaestro.executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON flowmaestro.executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON flowmaestro.executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON flowmaestro.execution_logs(execution_id, created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION flowmaestro.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON flowmaestro.workflows
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON flowmaestro.users
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Insert a default test user (password: 'testpassword123')
INSERT INTO flowmaestro.users (id, email, password_hash, name) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@flowmaestro.dev',
    crypt('testpassword123', gen_salt('bf')),
    'Test User'
) ON CONFLICT (email) DO NOTHING;
