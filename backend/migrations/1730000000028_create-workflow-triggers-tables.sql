-- Migration: Create Workflow Triggers Tables
-- Created: 2024-12-13
-- Description: Create tables for workflow triggers, trigger executions, and webhook logs

-- Create workflow_triggers table
CREATE TABLE IF NOT EXISTS flowmaestro.workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'webhook', 'schedule', 'event', 'manual'
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMP NULL,
    next_scheduled_at TIMESTAMP NULL,
    trigger_count BIGINT NOT NULL DEFAULT 0,
    temporal_schedule_id VARCHAR(255) NULL,
    webhook_secret VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create trigger_executions table (links triggers to workflow executions)
CREATE TABLE IF NOT EXISTS flowmaestro.trigger_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID NOT NULL REFERENCES flowmaestro.workflow_triggers(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES flowmaestro.executions(id) ON DELETE CASCADE,
    trigger_payload JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_logs table (for debugging webhook triggers)
CREATE TABLE IF NOT EXISTS flowmaestro.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID NULL REFERENCES flowmaestro.workflow_triggers(id) ON DELETE SET NULL,
    workflow_id UUID NULL REFERENCES flowmaestro.workflows(id) ON DELETE SET NULL,
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(1024) NULL,
    request_headers JSONB NULL,
    request_body JSONB NULL,
    request_query JSONB NULL,
    response_status INTEGER NULL,
    response_body JSONB NULL,
    error_message TEXT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    execution_id UUID NULL REFERENCES flowmaestro.executions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id ON flowmaestro.workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type ON flowmaestro.workflow_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_enabled ON flowmaestro.workflow_triggers(enabled) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_next_scheduled ON flowmaestro.workflow_triggers(next_scheduled_at) WHERE deleted_at IS NULL AND enabled = true;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_webhook_secret ON flowmaestro.workflow_triggers(webhook_secret) WHERE webhook_secret IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger_id ON flowmaestro.trigger_executions(trigger_id);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_execution_id ON flowmaestro.trigger_executions(execution_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_trigger_id ON flowmaestro.webhook_logs(trigger_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_workflow_id ON flowmaestro.webhook_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON flowmaestro.webhook_logs(created_at DESC);

-- Create updated_at trigger for workflow_triggers (drop first if exists)
DROP TRIGGER IF EXISTS update_workflow_triggers_updated_at ON flowmaestro.workflow_triggers;
CREATE TRIGGER update_workflow_triggers_updated_at BEFORE UPDATE ON flowmaestro.workflow_triggers
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();
