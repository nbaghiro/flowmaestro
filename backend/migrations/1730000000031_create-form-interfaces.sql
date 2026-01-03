-- Form Interfaces: Public-facing forms linked to workflows or agents
SET search_path TO flowmaestro, public;

-- Form Interface definitions
CREATE TABLE IF NOT EXISTS form_interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,

    -- Target (REQUIRED - must link to workflow OR agent)
    target_type VARCHAR(20) NOT NULL,  -- 'workflow' | 'agent'
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Branding
    cover_type VARCHAR(20) DEFAULT 'color',  -- 'image' | 'color' | 'stock'
    cover_value TEXT DEFAULT '#6366f1',      -- URL, hex color, or Unsplash photo ID
    icon_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Input Configuration
    input_placeholder TEXT DEFAULT 'Enter your message...',
    input_label VARCHAR(255) DEFAULT 'Message',
    allow_file_upload BOOLEAN DEFAULT true,
    allow_url_input BOOLEAN DEFAULT true,
    max_files INTEGER DEFAULT 5,
    max_file_size_mb INTEGER DEFAULT 25,
    allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/*', 'text/*'],

    -- Output Configuration
    output_label VARCHAR(255) DEFAULT 'Output',
    show_copy_button BOOLEAN DEFAULT true,
    show_download_button BOOLEAN DEFAULT true,
    allow_output_edit BOOLEAN DEFAULT true,

    -- Submit Button
    submit_button_text VARCHAR(100) DEFAULT 'Submit',
    submit_loading_text VARCHAR(100) DEFAULT 'Processing...',

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
    published_at TIMESTAMP NULL,

    -- Stats
    submission_count BIGINT DEFAULT 0,
    last_submission_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Constraints
    CONSTRAINT unique_user_slug UNIQUE (user_id, slug),
    CONSTRAINT valid_target CHECK (
        (target_type = 'workflow' AND workflow_id IS NOT NULL AND agent_id IS NULL) OR
        (target_type = 'agent' AND agent_id IS NOT NULL AND workflow_id IS NULL)
    )
);

-- Indexes for form_interfaces
CREATE INDEX IF NOT EXISTS idx_form_interfaces_user_id ON form_interfaces(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_interfaces_slug ON form_interfaces(slug) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_interfaces_status ON form_interfaces(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_interfaces_workflow ON form_interfaces(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_interfaces_agent ON form_interfaces(agent_id) WHERE deleted_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_form_interfaces_updated_at ON form_interfaces;
CREATE TRIGGER update_form_interfaces_updated_at BEFORE UPDATE ON form_interfaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Form interface submissions
CREATE TABLE IF NOT EXISTS form_interface_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_id UUID NOT NULL REFERENCES form_interfaces(id) ON DELETE CASCADE,

    -- User Input
    message TEXT,
    files JSONB DEFAULT '[]',     -- [{fileName, fileSize, mimeType, gcsUri}]
    urls JSONB DEFAULT '[]',      -- [{url, title?}]

    -- Output (populated in Phase 2)
    output TEXT,
    output_edited_at TIMESTAMP,   -- NULL if not edited, timestamp if user modified

    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for form_interface_submissions
CREATE INDEX IF NOT EXISTS idx_form_interface_submissions_interface_id ON form_interface_submissions(interface_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_interface_submissions_submitted_at ON form_interface_submissions(submitted_at DESC);

-- Function to update submission count
CREATE OR REPLACE FUNCTION update_form_interface_submission_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE form_interfaces
    SET submission_count = submission_count + 1,
        last_submission_at = NEW.submitted_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.interface_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update submission count
DROP TRIGGER IF EXISTS trigger_update_form_interface_submission_count ON form_interface_submissions;
CREATE TRIGGER trigger_update_form_interface_submission_count
    AFTER INSERT ON form_interface_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_form_interface_submission_count();
