-- Migration: Create persona tables
-- Description: Implements persona-based background agents system with pre-built personas
-- and user-initiated task instances that leverage long-running agent infrastructure

-- persona_definitions table: Pre-built persona configurations (seeded, not user-created)
CREATE TABLE flowmaestro.persona_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    avatar_url VARCHAR(500),

    -- Categorization
    category VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',

    -- Expertise
    expertise_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    example_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    typical_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Agent Configuration (inherited by instances)
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER NOT NULL DEFAULT 4096 CHECK (max_tokens > 0),

    -- Default Tools
    default_tools JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Long-Running Config Defaults
    default_max_duration_hours DECIMAL(5,2) NOT NULL DEFAULT 4.0,
    default_max_cost_credits INTEGER NOT NULL DEFAULT 100,
    autonomy_level VARCHAR(30) NOT NULL DEFAULT 'approve_high_risk',
    tool_risk_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Metadata
    featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CHECK (category IN ('research', 'content', 'development', 'data', 'operations', 'business')),
    CHECK (status IN ('active', 'beta', 'deprecated')),
    CHECK (autonomy_level IN ('full_auto', 'approve_high_risk', 'approve_all'))
);

-- persona_instances table: User-initiated persona task instances
CREATE TABLE flowmaestro.persona_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    persona_definition_id UUID NOT NULL REFERENCES flowmaestro.persona_definitions(id),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE,

    -- Task Definition
    task_title VARCHAR(255),
    task_description TEXT NOT NULL,
    additional_context JSONB DEFAULT '{}'::jsonb,

    -- Execution Tracking
    thread_id UUID REFERENCES flowmaestro.threads(id) ON DELETE SET NULL,
    execution_id UUID,

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'initializing',

    -- Configuration (can override persona defaults)
    max_duration_hours DECIMAL(5,2),
    max_cost_credits INTEGER,

    -- Progress Tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    accumulated_cost_credits DECIMAL(10,2) DEFAULT 0,
    iteration_count INTEGER DEFAULT 0,

    -- Completion
    completion_reason VARCHAR(50),

    -- Notifications
    notification_config JSONB NOT NULL DEFAULT '{
        "on_approval_needed": true,
        "on_completion": true,
        "slack_channel_id": null
    }'::jsonb,

    -- Sandbox Tracking (from long-running spec)
    sandbox_id VARCHAR(100),
    sandbox_state VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CHECK (status IN (
        'initializing', 'clarifying', 'running', 'waiting_approval',
        'completed', 'cancelled', 'failed', 'timeout'
    )),
    CHECK (completion_reason IS NULL OR completion_reason IN (
        'success', 'max_duration', 'max_cost', 'cancelled', 'failed', 'user_completed'
    )),
    CHECK (sandbox_state IS NULL OR sandbox_state IN (
        'creating', 'running', 'paused', 'killed'
    ))
);

-- Indexes for persona_definitions table
CREATE INDEX idx_persona_definitions_category ON flowmaestro.persona_definitions(category);
CREATE INDEX idx_persona_definitions_status ON flowmaestro.persona_definitions(status);
CREATE INDEX idx_persona_definitions_slug ON flowmaestro.persona_definitions(slug);
CREATE INDEX idx_persona_definitions_featured ON flowmaestro.persona_definitions(featured, sort_order)
    WHERE status = 'active';

-- Indexes for persona_instances table
CREATE INDEX idx_persona_instances_user_id ON flowmaestro.persona_instances(user_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_persona_instances_workspace_id ON flowmaestro.persona_instances(workspace_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_persona_instances_persona ON flowmaestro.persona_instances(persona_definition_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_persona_instances_status ON flowmaestro.persona_instances(status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_persona_instances_created_at ON flowmaestro.persona_instances(created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_persona_instances_thread_id ON flowmaestro.persona_instances(thread_id)
    WHERE thread_id IS NOT NULL;

-- Composite index for dashboard queries (user's active tasks)
CREATE INDEX idx_persona_instances_user_status ON flowmaestro.persona_instances(user_id, status, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Trigger for updated_at on persona_definitions table
CREATE TRIGGER update_persona_definitions_updated_at
BEFORE UPDATE ON flowmaestro.persona_definitions
FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Trigger for updated_at on persona_instances table
CREATE TRIGGER update_persona_instances_updated_at
BEFORE UPDATE ON flowmaestro.persona_instances
FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE flowmaestro.persona_definitions IS
'Pre-built AI persona definitions with specialized expertise, tools, and configurations';

COMMENT ON TABLE flowmaestro.persona_instances IS
'User-initiated background task instances that use a specific persona';

COMMENT ON COLUMN flowmaestro.persona_definitions.slug IS
'URL-friendly unique identifier for the persona (e.g., market-researcher)';

COMMENT ON COLUMN flowmaestro.persona_definitions.category IS
'Persona category: research, content, development, data, operations, business';

COMMENT ON COLUMN flowmaestro.persona_definitions.expertise_areas IS
'Array of expertise area strings describing what this persona excels at';

COMMENT ON COLUMN flowmaestro.persona_definitions.example_tasks IS
'Array of example task strings to show users what this persona can do';

COMMENT ON COLUMN flowmaestro.persona_definitions.typical_deliverables IS
'Array of deliverable types this persona typically produces';

COMMENT ON COLUMN flowmaestro.persona_definitions.default_tools IS
'Tool definitions available to this persona by default';

COMMENT ON COLUMN flowmaestro.persona_definitions.autonomy_level IS
'Default autonomy level: full_auto, approve_high_risk, approve_all';

COMMENT ON COLUMN flowmaestro.persona_definitions.tool_risk_overrides IS
'Per-tool risk level overrides from default classifications';

COMMENT ON COLUMN flowmaestro.persona_instances.task_description IS
'User-provided description of the task to perform';

COMMENT ON COLUMN flowmaestro.persona_instances.additional_context IS
'Additional context like file references, KB links, etc.';

COMMENT ON COLUMN flowmaestro.persona_instances.status IS
'Instance status: initializing, clarifying, running, waiting_approval, completed, cancelled, failed, timeout';

COMMENT ON COLUMN flowmaestro.persona_instances.completion_reason IS
'Why the instance completed: success, max_duration, max_cost, cancelled, failed, user_completed';

COMMENT ON COLUMN flowmaestro.persona_instances.notification_config IS
'User notification preferences for this instance';

COMMENT ON COLUMN flowmaestro.persona_instances.sandbox_id IS
'E2B sandbox identifier for code execution';

COMMENT ON COLUMN flowmaestro.persona_instances.sandbox_state IS
'Current state of the E2B sandbox: creating, running, paused, killed';
