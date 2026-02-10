-- Migration: Add new workflow template categories
-- Description: Adds multimodal-ai, knowledge-research, document-processing, data-analytics, voice-audio, advanced-logic categories

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE workflow_templates
DROP CONSTRAINT IF EXISTS valid_template_category;

-- Add the new constraint with additional categories
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
        'advanced-logic'
    )
);

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- To rollback:
-- DELETE FROM workflow_templates WHERE category IN ('multimodal-ai', 'knowledge-research', 'document-processing', 'data-analytics', 'voice-audio', 'advanced-logic');
-- ALTER TABLE workflow_templates DROP CONSTRAINT IF EXISTS valid_template_category;
-- ALTER TABLE workflow_templates ADD CONSTRAINT valid_template_category CHECK (category IN ('marketing', 'sales', 'operations', 'engineering', 'support', 'ecommerce', 'saas', 'healthcare'));
