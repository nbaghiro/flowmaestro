-- Migration: Create execution_logs table
-- Description: Stores detailed per-node execution logs for debugging and analytics

-- Create the execution_logs table
CREATE TABLE flowmaestro.execution_logs (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    node_name VARCHAR(255),

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),

    -- Data (stored as JSONB, may be truncated)
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,

    -- Token usage for LLM nodes
    token_usage JSONB,

    -- Retry information
    attempt_number INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_execution_logs_execution_id ON flowmaestro.execution_logs(execution_id);
CREATE INDEX idx_execution_logs_node_id ON flowmaestro.execution_logs(node_id);
CREATE INDEX idx_execution_logs_node_type ON flowmaestro.execution_logs(node_type);
CREATE INDEX idx_execution_logs_status ON flowmaestro.execution_logs(status);
CREATE INDEX idx_execution_logs_started_at ON flowmaestro.execution_logs(started_at DESC);
CREATE INDEX idx_execution_logs_created_at ON flowmaestro.execution_logs(created_at DESC);

-- Composite index for execution timeline
CREATE INDEX idx_execution_logs_execution_timeline
    ON flowmaestro.execution_logs(execution_id, started_at ASC);

-- Index for finding slow nodes
CREATE INDEX idx_execution_logs_duration
    ON flowmaestro.execution_logs(duration_ms DESC)
    WHERE duration_ms IS NOT NULL;

-- Index for finding failed nodes
CREATE INDEX idx_execution_logs_failed
    ON flowmaestro.execution_logs(execution_id, created_at DESC)
    WHERE status = 'failed';

-- Index for token usage analytics
CREATE INDEX idx_execution_logs_token_usage
    ON flowmaestro.execution_logs(execution_id)
    WHERE token_usage IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE flowmaestro.execution_logs IS 'Detailed per-node execution logs for debugging and analytics';
COMMENT ON COLUMN flowmaestro.execution_logs.input_data IS 'Node input data (may be truncated for large payloads)';
COMMENT ON COLUMN flowmaestro.execution_logs.output_data IS 'Node output data (may be truncated for large payloads)';
COMMENT ON COLUMN flowmaestro.execution_logs.token_usage IS 'Token usage for LLM nodes including model, provider, and cost';
COMMENT ON COLUMN flowmaestro.execution_logs.attempt_number IS 'Retry attempt number (1-based)';

-- Create a function to auto-clean old logs (optional, can be called via cron)
CREATE OR REPLACE FUNCTION flowmaestro.cleanup_old_execution_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM flowmaestro.execution_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION flowmaestro.cleanup_old_execution_logs IS 'Deletes node logs older than the specified retention period';
