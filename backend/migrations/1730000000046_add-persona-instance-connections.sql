-- Migration: Add persona instance connections table and connection requirements
-- Description: Track which integrations/connections a persona instance can access

-- Create persona_instance_connections table
CREATE TABLE IF NOT EXISTS flowmaestro.persona_instance_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    instance_id UUID NOT NULL REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES flowmaestro.connections(id) ON DELETE CASCADE,

    -- Access scope (optional scope limiting)
    granted_scopes JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique connection per instance
    UNIQUE(instance_id, connection_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_persona_instance_connections_instance
    ON flowmaestro.persona_instance_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_persona_instance_connections_connection
    ON flowmaestro.persona_instance_connections(connection_id);

-- Add connection_requirements field to persona_definitions
ALTER TABLE flowmaestro.persona_definitions
ADD COLUMN IF NOT EXISTS connection_requirements JSONB NOT NULL DEFAULT '[]';

-- Add comments for documentation
COMMENT ON TABLE flowmaestro.persona_instance_connections IS 'Tracks which connections/integrations a persona instance has been granted access to';
COMMENT ON COLUMN flowmaestro.persona_instance_connections.granted_scopes IS 'Specific scopes granted for this connection (e.g., ["read:repos", "write:prs"])';
COMMENT ON COLUMN flowmaestro.persona_definitions.connection_requirements IS 'Array of connection requirements for this persona (provider, required, reason, suggested_scopes)';

-- Down Migration (commented out, run manually if needed)
-- DROP TABLE IF EXISTS flowmaestro.persona_instance_connections;
-- ALTER TABLE flowmaestro.persona_definitions DROP COLUMN IF EXISTS connection_requirements;
