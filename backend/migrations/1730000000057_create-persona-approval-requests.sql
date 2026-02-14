-- Migration: Create persona_approval_requests table
-- Purpose: Track approval requests for persona tool executions requiring user approval

-- Create persona_approval_requests table
CREATE TABLE IF NOT EXISTS flowmaestro.persona_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship to persona instance
    instance_id UUID NOT NULL REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE,

    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'tool_call', 'file_write', 'external_api', 'send_message', 'cost_threshold'
    )),
    tool_name VARCHAR(255),
    action_description TEXT NOT NULL,
    action_arguments JSONB NOT NULL DEFAULT '{}',

    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    estimated_cost_credits DECIMAL(10, 2),

    -- Context for user decision
    agent_context TEXT,
    alternatives TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'denied', 'expired'
    )),

    -- Response tracking
    responded_by UUID REFERENCES flowmaestro.users(id),
    responded_at TIMESTAMPTZ,
    response_note TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Index for finding pending approvals by instance
CREATE INDEX IF NOT EXISTS idx_persona_approval_requests_instance_status
ON flowmaestro.persona_approval_requests (instance_id, status);

-- Index for finding all pending approvals (for global approval queue)
CREATE INDEX IF NOT EXISTS idx_persona_approval_requests_status_created
ON flowmaestro.persona_approval_requests (status, created_at DESC)
WHERE status = 'pending';

-- Index for finding approvals by workspace (via join with persona_instances)
-- This is useful for the dashboard needs_attention count
CREATE INDEX IF NOT EXISTS idx_persona_approval_requests_created_at
ON flowmaestro.persona_approval_requests (created_at DESC);

-- Add pending_approval_id column to persona_instances for quick lookup
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS pending_approval_id UUID REFERENCES flowmaestro.persona_approval_requests(id);

-- Index for finding instances with pending approvals
CREATE INDEX IF NOT EXISTS idx_persona_instances_pending_approval
ON flowmaestro.persona_instances (pending_approval_id)
WHERE pending_approval_id IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE flowmaestro.persona_approval_requests IS
'Tracks approval requests for persona tool executions that require user approval based on risk level or autonomy settings';

COMMENT ON COLUMN flowmaestro.persona_approval_requests.action_type IS
'Category of action: tool_call (specific tool), file_write, external_api, send_message, cost_threshold';

COMMENT ON COLUMN flowmaestro.persona_approval_requests.risk_level IS
'Risk level determined by tool default or persona autonomy settings';

COMMENT ON COLUMN flowmaestro.persona_approval_requests.agent_context IS
'Summary of what the agent has done so far, providing context for the approval decision';

COMMENT ON COLUMN flowmaestro.persona_approval_requests.alternatives IS
'What the agent will do if this request is denied';
