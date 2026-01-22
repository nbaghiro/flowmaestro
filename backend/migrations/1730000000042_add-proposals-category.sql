-- Migration: Add proposals category to persona_definitions
-- Description: Adds 'proposals' as a valid category for personas

-- Drop the existing constraint
ALTER TABLE flowmaestro.persona_definitions
DROP CONSTRAINT IF EXISTS persona_definitions_category_check;

-- Add the updated constraint with 'proposals' category
ALTER TABLE flowmaestro.persona_definitions
ADD CONSTRAINT persona_definitions_category_check
CHECK (category IN ('research', 'content', 'development', 'data', 'operations', 'business', 'proposals'));
