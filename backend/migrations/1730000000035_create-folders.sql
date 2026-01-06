-- Migration: Create Folders Table and Add folder_id to Resource Tables
-- Created: 2025-01-XX
-- Description: Add folder organization support - create folders table and link all resource types to folders

SET search_path TO flowmaestro, public;

-- FOLDERS TABLE

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',  -- hex color
    position INTEGER DEFAULT 0,          -- for manual ordering
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ              -- soft delete
);

-- Indexes for folders
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(user_id, position) WHERE deleted_at IS NULL;

-- Unique constraint: folder names must be unique per user (only for active folders)
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_unique_name_per_user 
ON folders(user_id, name) 
WHERE deleted_at IS NULL;

-- Updated at trigger for folders
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ADD folder_id TO RESOURCE TABLES

-- Workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_folder ON workflows(folder_id) WHERE deleted_at IS NULL;

-- Agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_folder ON agents(folder_id) WHERE deleted_at IS NULL;

-- Form Interfaces
ALTER TABLE form_interfaces
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_interfaces_folder ON form_interfaces(folder_id) WHERE deleted_at IS NULL;

-- Chat Interfaces
ALTER TABLE chat_interfaces
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_interfaces_folder ON chat_interfaces(folder_id) WHERE deleted_at IS NULL;

-- Knowledge Bases
ALTER TABLE knowledge_bases
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_folder ON knowledge_bases(folder_id);

