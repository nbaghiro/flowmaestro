-- Folders: Unified organization for workflows, agents, form interfaces, chat interfaces, and knowledge bases
SET search_path TO flowmaestro, public;

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',  -- hex color

    -- Ordering
    position INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Unique folder name per user (case-insensitive)
    CONSTRAINT unique_folder_name_per_user UNIQUE (user_id, name)
);

-- Indexes for folders
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(user_id, position) WHERE deleted_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add folder_ids array to workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_workflows_folder_ids ON workflows USING GIN(folder_ids) WHERE deleted_at IS NULL;

-- Add folder_ids array to agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_agents_folder_ids ON agents USING GIN(folder_ids) WHERE deleted_at IS NULL;

-- Add folder_ids array to form_interfaces
ALTER TABLE form_interfaces
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_form_interfaces_folder_ids ON form_interfaces USING GIN(folder_ids) WHERE deleted_at IS NULL;

-- Add folder_ids array to chat_interfaces
ALTER TABLE chat_interfaces
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_chat_interfaces_folder_ids ON chat_interfaces USING GIN(folder_ids) WHERE deleted_at IS NULL;

-- Add folder_ids array and deleted_at to knowledge_bases (for consistency with other tables)
ALTER TABLE knowledge_bases
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE knowledge_bases
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_folder_ids ON knowledge_bases USING GIN(folder_ids);
