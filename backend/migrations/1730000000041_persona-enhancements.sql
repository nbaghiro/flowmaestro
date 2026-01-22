-- Migration: Persona v2 Enhancements
-- Description: Adds structured inputs, guaranteed deliverables, progress tracking, and related tables

-- =============================================================================
-- ALTER persona_definitions to add v2 fields
-- =============================================================================

-- Add title column (short title like "Competitive Intel Analyst")
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS title VARCHAR(100);

-- Add specialty column (one-line description of what they do)
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Add structured input fields (form fields for task configuration)
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS input_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add guaranteed deliverables specification
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS deliverables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add standard operating procedure steps
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS sop_steps JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add estimated duration (min/max minutes)
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS estimated_duration JSONB NOT NULL DEFAULT '{"min_minutes": 15, "max_minutes": 30}'::jsonb;

-- Add estimated cost in credits
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS estimated_cost_credits INTEGER NOT NULL DEFAULT 25;

-- Update existing rows to have default title from name
UPDATE flowmaestro.persona_definitions
SET title = split_part(name, ' - ', 1)
WHERE title IS NULL;

-- Make title NOT NULL after populating
ALTER TABLE flowmaestro.persona_definitions
ALTER COLUMN title SET NOT NULL;

-- =============================================================================
-- ALTER persona_instances to add v2 fields
-- =============================================================================

-- Add structured inputs (validated against persona's input_fields)
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS structured_inputs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add progress tracking
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS progress JSONB;

-- Make task_description optional (can use structured_inputs instead)
ALTER TABLE flowmaestro.persona_instances
ALTER COLUMN task_description DROP NOT NULL;

-- =============================================================================
-- Create persona_instance_messages table
-- =============================================================================

CREATE TABLE IF NOT EXISTS flowmaestro.persona_instance_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,

    -- Metadata for categorization
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_persona_instance_messages_instance
ON flowmaestro.persona_instance_messages(instance_id, created_at);

-- =============================================================================
-- Create persona_instance_deliverables table
-- =============================================================================

CREATE TABLE IF NOT EXISTS flowmaestro.persona_instance_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,

    -- Content storage (for text-based deliverables)
    content TEXT,

    -- File storage (for file-based deliverables)
    file_url VARCHAR(500),
    file_size_bytes INTEGER,
    file_extension VARCHAR(20),

    -- Preview for large content
    preview TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (type IN ('markdown', 'csv', 'json', 'pdf', 'code', 'image', 'html'))
);

CREATE INDEX IF NOT EXISTS idx_persona_instance_deliverables_instance
ON flowmaestro.persona_instance_deliverables(instance_id, created_at);

-- =============================================================================
-- Create persona_instance_activity table (for activity log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS flowmaestro.persona_instance_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    step_index INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (type IN ('info', 'progress', 'finding', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_persona_instance_activity_instance
ON flowmaestro.persona_instance_activity(instance_id, created_at);

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON COLUMN flowmaestro.persona_definitions.title IS
'Short title for the persona (e.g., "Competitive Intel Analyst")';

COMMENT ON COLUMN flowmaestro.persona_definitions.specialty IS
'One-line description of what this persona specializes in';

COMMENT ON COLUMN flowmaestro.persona_definitions.input_fields IS
'Structured input field definitions for task configuration form';

COMMENT ON COLUMN flowmaestro.persona_definitions.deliverables IS
'Specification of deliverables this persona guarantees to produce';

COMMENT ON COLUMN flowmaestro.persona_definitions.sop_steps IS
'Standard operating procedure steps the persona follows';

COMMENT ON COLUMN flowmaestro.persona_definitions.estimated_duration IS
'Estimated duration range in minutes {min_minutes, max_minutes}';

COMMENT ON COLUMN flowmaestro.persona_definitions.estimated_cost_credits IS
'Estimated cost in credits for a typical task';

COMMENT ON COLUMN flowmaestro.persona_instances.structured_inputs IS
'Structured inputs provided by user, validated against persona input_fields';

COMMENT ON COLUMN flowmaestro.persona_instances.progress IS
'Current progress tracking {current_step, total_steps, current_step_name, percentage, message}';

COMMENT ON TABLE flowmaestro.persona_instance_messages IS
'Conversation messages for a persona instance';

COMMENT ON TABLE flowmaestro.persona_instance_deliverables IS
'Deliverables produced by a persona instance';

COMMENT ON TABLE flowmaestro.persona_instance_activity IS
'Activity log entries for a persona instance';
