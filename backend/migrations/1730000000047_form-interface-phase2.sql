-- Form Interfaces Phase 2: Execution & Embedding Tables
-- Adds execution tracking, trigger management, and RAG capabilities for form submissions
SET search_path TO flowmaestro, public;

-- Add trigger_id column to form_interfaces for workflow triggers
ALTER TABLE form_interfaces
ADD COLUMN IF NOT EXISTS trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE SET NULL;

-- Add execution tracking columns to form_interface_submissions
ALTER TABLE form_interface_submissions
ADD COLUMN IF NOT EXISTS execution_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS execution_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS attachments_status VARCHAR(50) DEFAULT 'pending';
-- execution_status: pending, running, completed, failed
-- attachments_status: pending, processing, ready, failed

-- Index for execution lookups
CREATE INDEX IF NOT EXISTS idx_form_interface_submissions_execution_id
ON form_interface_submissions(execution_id) WHERE execution_id IS NOT NULL;

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_form_interface_submissions_execution_status
ON form_interface_submissions(execution_status);

-- =====================================================
-- SUBMISSION CHUNKS TABLE (for RAG on attachments)
-- =====================================================

CREATE TABLE IF NOT EXISTS form_interface_submission_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES form_interface_submissions(id) ON DELETE CASCADE,

    -- Source info
    source_type VARCHAR(20) NOT NULL,  -- 'file' | 'url'
    source_name VARCHAR(500),          -- filename or URL
    source_index INTEGER,              -- index in files/urls array

    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Embedding (same dimensions as KB chunks)
    embedding vector(1536),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_submission_chunks_submission_id
ON form_interface_submission_chunks(submission_id);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_submission_chunks_embedding
ON form_interface_submission_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for trigger_id lookups
CREATE INDEX IF NOT EXISTS idx_form_interfaces_trigger_id
ON form_interfaces(trigger_id) WHERE trigger_id IS NOT NULL;
