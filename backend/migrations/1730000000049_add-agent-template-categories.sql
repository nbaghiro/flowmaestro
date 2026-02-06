-- Migration: Add new agent template categories
-- Description: Adds ecommerce, hr, and finance categories to agent_templates

-- Drop and recreate the category constraint with new categories
ALTER TABLE flowmaestro.agent_templates
DROP CONSTRAINT IF EXISTS valid_agent_template_category;

ALTER TABLE flowmaestro.agent_templates
ADD CONSTRAINT valid_agent_template_category CHECK (
    category IN ('marketing', 'sales', 'operations', 'engineering', 'support', 'ecommerce', 'hr', 'finance')
);

-- Update the comment to reflect new categories
COMMENT ON COLUMN flowmaestro.agent_templates.category IS 'Template category: marketing, sales, operations, engineering, support, ecommerce, hr, finance';
