-- Migration: Add knowledge base integration sources
-- Supports importing documents from integration providers with sync capability

-- Create knowledge_base_sources table
CREATE TABLE flowmaestro.knowledge_base_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES flowmaestro.connections(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('folder', 'file', 'search')),
    source_config JSONB NOT NULL DEFAULT '{}',
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60 CHECK (sync_interval_minutes >= 5),
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Comments for documentation
COMMENT ON TABLE flowmaestro.knowledge_base_sources IS 'Integration sources for knowledge base document import with sync';
COMMENT ON COLUMN flowmaestro.knowledge_base_sources.source_type IS 'folder: import folder, file: specific files, search: search query results';
COMMENT ON COLUMN flowmaestro.knowledge_base_sources.source_config IS 'Configuration: folderId, folderPath, fileIds, searchQuery, recursive, mimeTypes';
COMMENT ON COLUMN flowmaestro.knowledge_base_sources.sync_interval_minutes IS 'Minimum 5 minutes, default 60';

-- Indexes for common queries
CREATE INDEX idx_kb_sources_kb_id ON flowmaestro.knowledge_base_sources(knowledge_base_id);
CREATE INDEX idx_kb_sources_connection_id ON flowmaestro.knowledge_base_sources(connection_id);
CREATE INDEX idx_kb_sources_sync_status ON flowmaestro.knowledge_base_sources(sync_status);
-- Index for finding sources that need sync
CREATE INDEX idx_kb_sources_next_sync ON flowmaestro.knowledge_base_sources(sync_enabled, last_synced_at)
    WHERE sync_enabled = true;

-- Add trigger for updated_at
CREATE TRIGGER update_knowledge_base_sources_updated_at
    BEFORE UPDATE ON flowmaestro.knowledge_base_sources
    FOR EACH ROW
    EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Add integration source fields to knowledge_documents
ALTER TABLE flowmaestro.knowledge_documents
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES flowmaestro.knowledge_base_sources(id) ON DELETE SET NULL;

-- Comment on new column
COMMENT ON COLUMN flowmaestro.knowledge_documents.source_id IS 'Reference to integration source if imported from provider';

-- Index for finding documents by source
CREATE INDEX idx_kb_documents_source_id ON flowmaestro.knowledge_documents(source_id) WHERE source_id IS NOT NULL;
