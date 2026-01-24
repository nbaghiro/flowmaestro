-- Migration: Add continuation support to persona instances
-- Description: Allows users to continue work on completed instances with additional instructions

-- Add continuation tracking columns
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS parent_instance_id UUID REFERENCES flowmaestro.persona_instances(id) ON DELETE SET NULL;

ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS continuation_count INTEGER NOT NULL DEFAULT 0;

-- Index for finding continuations of an instance
CREATE INDEX IF NOT EXISTS idx_persona_instances_parent
ON flowmaestro.persona_instances(parent_instance_id)
WHERE parent_instance_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN flowmaestro.persona_instances.parent_instance_id IS
'Reference to the original instance this is a continuation of';

COMMENT ON COLUMN flowmaestro.persona_instances.continuation_count IS
'Number of times this instance has been continued (0 for original instances)';
