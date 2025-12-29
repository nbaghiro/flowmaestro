-- Migration: Create workflow_snapshots table
-- Description: Stores workflow execution snapshots for pause/resume and failure recovery

-- Create the workflow_snapshots table
CREATE TABLE flowmaestro.workflow_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES flowmaestro.executions(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('checkpoint', 'pause', 'failure', 'final')),
    schema_version INTEGER NOT NULL DEFAULT 1,

    -- Execution state (stored as JSONB for flexibility)
    completed_nodes JSONB NOT NULL DEFAULT '[]',
    pending_nodes JSONB NOT NULL DEFAULT '[]',
    executing_nodes JSONB NOT NULL DEFAULT '[]',
    failed_nodes JSONB NOT NULL DEFAULT '[]',
    skipped_nodes JSONB NOT NULL DEFAULT '[]',

    -- Context data
    node_outputs JSONB NOT NULL DEFAULT '{}',
    workflow_variables JSONB NOT NULL DEFAULT '{}',
    inputs JSONB NOT NULL DEFAULT '{}',

    -- Loop/Parallel state
    loop_states JSONB NOT NULL DEFAULT '[]',
    parallel_states JSONB NOT NULL DEFAULT '[]',

    -- Pause context (only for pause snapshots)
    pause_context JSONB,

    -- Metadata
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    total_size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_workflow_snapshots_execution_id ON flowmaestro.workflow_snapshots(execution_id);
CREATE INDEX idx_workflow_snapshots_user_id ON flowmaestro.workflow_snapshots(user_id);
CREATE INDEX idx_workflow_snapshots_type ON flowmaestro.workflow_snapshots(snapshot_type);
CREATE INDEX idx_workflow_snapshots_created_at ON flowmaestro.workflow_snapshots(created_at DESC);

-- Composite index for finding latest snapshot by execution
CREATE INDEX idx_workflow_snapshots_execution_created
    ON flowmaestro.workflow_snapshots(execution_id, created_at DESC);

-- Index for finding paused executions by user
CREATE INDEX idx_workflow_snapshots_user_paused
    ON flowmaestro.workflow_snapshots(user_id, created_at DESC)
    WHERE snapshot_type = 'pause';

-- Add comment for documentation
COMMENT ON TABLE flowmaestro.workflow_snapshots IS 'Stores workflow execution snapshots for pause/resume and failure recovery';
COMMENT ON COLUMN flowmaestro.workflow_snapshots.snapshot_type IS 'Type of snapshot: checkpoint (auto), pause (user), failure, or final';
COMMENT ON COLUMN flowmaestro.workflow_snapshots.schema_version IS 'Version of the snapshot schema for migrations';
COMMENT ON COLUMN flowmaestro.workflow_snapshots.pause_context IS 'Context for paused snapshots including reason and resume conditions';
