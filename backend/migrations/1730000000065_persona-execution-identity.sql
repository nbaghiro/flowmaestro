-- Migration: Give persona instances their own execution identity
-- Persona runs reuse the threads and agent_executions tables but are not agents. They
-- were inserted with agent_id = persona definition id, which violates the foreign key
-- to agents, so no persona instance could ever be created. Each row now belongs to
-- exactly one of an agent or a persona instance.

ALTER TABLE flowmaestro.threads
    ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE flowmaestro.threads
    ADD COLUMN IF NOT EXISTS persona_instance_id UUID
        REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.threads
    ADD CONSTRAINT threads_owner_check
        CHECK ((agent_id IS NOT NULL) <> (persona_instance_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_threads_persona_instance_id
    ON flowmaestro.threads(persona_instance_id) WHERE deleted_at IS NULL;

ALTER TABLE flowmaestro.agent_executions
    ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE flowmaestro.agent_executions
    ADD COLUMN IF NOT EXISTS persona_instance_id UUID
        REFERENCES flowmaestro.persona_instances(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.agent_executions
    ADD CONSTRAINT agent_executions_owner_check
        CHECK ((agent_id IS NOT NULL) <> (persona_instance_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_agent_executions_persona_instance_id
    ON flowmaestro.agent_executions(persona_instance_id);

COMMENT ON COLUMN flowmaestro.threads.persona_instance_id IS
    'Owning persona instance when the thread belongs to a persona run; exactly one of agent_id and persona_instance_id is set';
COMMENT ON COLUMN flowmaestro.agent_executions.persona_instance_id IS
    'Owning persona instance when the execution belongs to a persona run; exactly one of agent_id and persona_instance_id is set';
