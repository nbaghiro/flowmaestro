-- Migration: Add clarification tracking fields to persona_instances
-- Description: Supports the clarifying phase where personas ask clarifying questions before starting work

-- Up Migration
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS clarification_complete BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS clarification_exchange_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS clarification_max_exchanges INTEGER NOT NULL DEFAULT 3;

ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS clarification_skipped BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN flowmaestro.persona_instances.clarification_complete IS 'Whether the clarifying phase has been completed';
COMMENT ON COLUMN flowmaestro.persona_instances.clarification_exchange_count IS 'Number of clarifying question/answer exchanges that have occurred';
COMMENT ON COLUMN flowmaestro.persona_instances.clarification_max_exchanges IS 'Maximum number of clarifying exchanges before auto-proceeding';
COMMENT ON COLUMN flowmaestro.persona_instances.clarification_skipped IS 'Whether the user chose to skip clarification';

-- Down Migration (commented out, run manually if needed)
-- ALTER TABLE flowmaestro.persona_instances DROP COLUMN IF EXISTS clarification_complete;
-- ALTER TABLE flowmaestro.persona_instances DROP COLUMN IF EXISTS clarification_exchange_count;
-- ALTER TABLE flowmaestro.persona_instances DROP COLUMN IF EXISTS clarification_max_exchanges;
-- ALTER TABLE flowmaestro.persona_instances DROP COLUMN IF EXISTS clarification_skipped;
