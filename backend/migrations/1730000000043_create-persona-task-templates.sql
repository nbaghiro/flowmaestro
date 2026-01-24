-- Migration: Create persona task templates table
-- Description: Pre-built task patterns for personas with variable substitution

-- persona_task_templates table: Reusable task patterns for each persona
CREATE TABLE flowmaestro.persona_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship to persona
    persona_definition_id UUID NOT NULL REFERENCES flowmaestro.persona_definitions(id) ON DELETE CASCADE,

    -- Template Identity
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50),  -- Emoji or icon identifier

    -- Template Content
    task_template TEXT NOT NULL,  -- Template text with {{variable}} placeholders
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example variables structure:
    -- [
    --   {"name": "competitors", "label": "Competitors", "type": "text", "required": true, "placeholder": "e.g., Cursor, Copilot"},
    --   {"name": "focus_areas", "label": "Focus Areas", "type": "multiselect", "options": [{"value": "pricing", "label": "Pricing"}], "default": ["pricing"]}
    -- ]

    -- Suggested defaults when using this template
    suggested_duration_hours DECIMAL(5,2) DEFAULT 2.0,
    suggested_max_cost INTEGER DEFAULT 50,

    -- Metadata
    sort_order INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,  -- Track popularity
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CHECK (status IN ('active', 'beta', 'deprecated')),
    UNIQUE (persona_definition_id, name)
);

-- Indexes
CREATE INDEX idx_persona_task_templates_persona ON flowmaestro.persona_task_templates(persona_definition_id);
CREATE INDEX idx_persona_task_templates_status ON flowmaestro.persona_task_templates(status);
CREATE INDEX idx_persona_task_templates_sort ON flowmaestro.persona_task_templates(persona_definition_id, sort_order)
    WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_persona_task_templates_updated_at
BEFORE UPDATE ON flowmaestro.persona_task_templates
FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Add template tracking to persona_instances
ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES flowmaestro.persona_task_templates(id) ON DELETE SET NULL;

ALTER TABLE flowmaestro.persona_instances
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}'::jsonb;

-- Index for template usage analytics
CREATE INDEX idx_persona_instances_template ON flowmaestro.persona_instances(template_id)
    WHERE template_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE flowmaestro.persona_task_templates IS
'Pre-built task templates for personas with variable substitution';

COMMENT ON COLUMN flowmaestro.persona_task_templates.task_template IS
'Template text with {{variable}} placeholders for substitution';

COMMENT ON COLUMN flowmaestro.persona_task_templates.variables IS
'JSON array of variable definitions matching PersonaInputField structure';

COMMENT ON COLUMN flowmaestro.persona_task_templates.usage_count IS
'Number of times this template has been used to launch tasks';

COMMENT ON COLUMN flowmaestro.persona_instances.template_id IS
'Reference to template used to create this instance, if any';

COMMENT ON COLUMN flowmaestro.persona_instances.template_variables IS
'Variable values provided when using a template';
