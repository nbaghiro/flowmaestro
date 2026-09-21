-- Migration: Add healthcare category to persona_definitions
-- Description: Adds 'healthcare' as a valid category for personas (Healthcare & Life Sciences)

-- Drop the existing constraint
ALTER TABLE flowmaestro.persona_definitions
DROP CONSTRAINT IF EXISTS persona_definitions_category_check;

-- Add the updated constraint with 'healthcare' category
ALTER TABLE flowmaestro.persona_definitions
ADD CONSTRAINT persona_definitions_category_check
CHECK (category IN ('research', 'content', 'development', 'data', 'operations', 'business', 'proposals', 'healthcare'));
