-- Add pause_context column to executions table for human-in-the-loop support
-- This stores the context needed to resume a paused workflow

ALTER TABLE flowmaestro.executions
ADD COLUMN IF NOT EXISTS pause_context JSONB;

-- Add comment for documentation
COMMENT ON COLUMN flowmaestro.executions.pause_context IS 'Context for paused executions including prompt, variable name, and validation rules for human review';

-- Create index for finding paused executions
CREATE INDEX IF NOT EXISTS idx_executions_status_paused
ON flowmaestro.executions (status)
WHERE status = 'paused';
