-- Migration: Add soft delete support to executions table
-- This enables execution deletion while preserving audit trails

-- Add deleted_at column for soft delete
ALTER TABLE flowmaestro.executions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create partial index for efficient queries on non-deleted executions
CREATE INDEX IF NOT EXISTS idx_executions_deleted_at ON flowmaestro.executions(deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN flowmaestro.executions.deleted_at IS 'Timestamp when execution was soft deleted. NULL indicates active execution.';
