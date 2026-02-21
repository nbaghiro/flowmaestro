-- Migration: Persona improvements
-- Purpose: Add credit threshold config, approval warning tracking, and performance indexes

-- Add credit threshold configuration to persona_instances
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS credit_threshold_config JSONB NOT NULL DEFAULT '{
    "thresholds": [50, 75, 90],
    "pause_at_limit": false,
    "notified_thresholds": []
}'::jsonb;

-- Add last notified threshold for quick checking (avoids JSONB queries in hot path)
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS last_credit_threshold_notified INTEGER DEFAULT 0;

-- Add warning_sent_at to approval_requests for tracking expiration warnings
ALTER TABLE flowmaestro.persona_approval_requests
ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ;

-- Index for finding expiring approval requests (for the expiration scheduler)
CREATE INDEX IF NOT EXISTS idx_persona_approval_requests_expiring
ON flowmaestro.persona_approval_requests(expires_at)
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Index for dashboard queries (filter by user/workspace, status, order by updated_at)
CREATE INDEX IF NOT EXISTS idx_persona_instances_dashboard
ON flowmaestro.persona_instances(user_id, workspace_id, status, updated_at DESC)
WHERE deleted_at IS NULL;

-- Index for filtering persona definitions by category and slug
CREATE INDEX IF NOT EXISTS idx_persona_definitions_category_slug
ON flowmaestro.persona_definitions(category, slug);

-- Index for finding instances by persona definition and status (for analytics)
CREATE INDEX IF NOT EXISTS idx_persona_instances_definition_status
ON flowmaestro.persona_instances(persona_definition_id, status)
WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN flowmaestro.persona_instances.credit_threshold_config IS
'Configuration for credit usage alerts: thresholds (percentages), pause_at_limit (pause vs fail), notified_thresholds (already sent)';

COMMENT ON COLUMN flowmaestro.persona_instances.last_credit_threshold_notified IS
'Last credit threshold percentage that was notified (0, 50, 75, 90, etc.) - avoids JSONB queries in hot path';

COMMENT ON COLUMN flowmaestro.persona_approval_requests.warning_sent_at IS
'When the expiring soon warning was sent - null if not yet warned';
