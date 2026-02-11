-- Add system workflow support
-- System workflows are pre-created workflows for internal FlowMaestro operations
-- They are stored in the same table but filtered from user workflow lists

-- Add workflow_type to distinguish user vs system workflows
ALTER TABLE flowmaestro.workflows
ADD COLUMN IF NOT EXISTS workflow_type VARCHAR(50) DEFAULT 'user';

-- Add system_key for programmatic lookup (e.g., 'blog-generation')
ALTER TABLE flowmaestro.workflows
ADD COLUMN IF NOT EXISTS system_key VARCHAR(255);

-- Constraint for valid workflow types
ALTER TABLE flowmaestro.workflows ADD CONSTRAINT valid_workflow_type
CHECK (workflow_type IN ('user', 'system'));

-- Unique constraint on system_key (only one workflow per key)
CREATE UNIQUE INDEX idx_workflows_system_key
ON flowmaestro.workflows(system_key)
WHERE system_key IS NOT NULL AND deleted_at IS NULL;

-- Index for filtering by type
CREATE INDEX idx_workflows_type
ON flowmaestro.workflows(workflow_type)
WHERE deleted_at IS NULL;
