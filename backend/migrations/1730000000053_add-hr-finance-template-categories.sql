-- Migration: Add HR and Finance workflow template categories
-- Description: Adds hr and finance categories to workflow_templates

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE workflow_templates
DROP CONSTRAINT IF EXISTS valid_template_category;

-- Add the new constraint with HR and Finance categories
ALTER TABLE workflow_templates
ADD CONSTRAINT valid_template_category CHECK (
    category IN (
        'marketing',
        'sales',
        'operations',
        'engineering',
        'support',
        'ecommerce',
        'saas',
        'healthcare',
        'multimodal-ai',
        'knowledge-research',
        'document-processing',
        'data-analytics',
        'voice-audio',
        'advanced-logic',
        'hr',
        'finance'
    )
);

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- To rollback:
-- DELETE FROM workflow_templates WHERE category IN ('hr', 'finance');
-- ALTER TABLE workflow_templates DROP CONSTRAINT IF EXISTS valid_template_category;
-- ALTER TABLE workflow_templates ADD CONSTRAINT valid_template_category CHECK (category IN ('marketing', 'sales', 'operations', 'engineering', 'support', 'ecommerce', 'saas', 'healthcare', 'multimodal-ai', 'knowledge-research', 'document-processing', 'data-analytics', 'voice-audio', 'advanced-logic'));
