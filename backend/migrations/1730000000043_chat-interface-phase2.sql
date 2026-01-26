-- Add execution tracking to sessions
-- Use the flowmaestro schema explicitly
SET search_path TO flowmaestro, public;

-- =====================================================
-- ADD ATTACHMENTS TO AGENT MESSAGES
-- =====================================================
-- Store file attachments with messages for history retrieval
ALTER TABLE flowmaestro.agent_messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Ensure vector extension exists at the database level
-- This may require superuser privileges
DO $$ 
BEGIN 
    CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;
EXCEPTION 
    WHEN insufficient_privilege THEN 
        RAISE NOTICE 'Insufficient privilege to create extension; assuming it exists or is being handled by an admin.';
END $$;

-- Add columns to sessions
ALTER TABLE flowmaestro.chat_interface_sessions
ADD COLUMN IF NOT EXISTS current_execution_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS execution_status VARCHAR(50) DEFAULT 'idle';

-- Index for execution lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_execution_id
ON flowmaestro.chat_interface_sessions(current_execution_id)
WHERE current_execution_id IS NOT NULL;

-- =====================================================
-- MESSAGE ATTACHMENT CHUNKS TABLE (for RAG)
-- =====================================================

CREATE TABLE IF NOT EXISTS flowmaestro.chat_interface_message_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES flowmaestro.chat_interface_sessions(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES flowmaestro.threads(id) ON DELETE CASCADE,

    -- Source info
    source_type VARCHAR(20) NOT NULL,  -- 'file' | 'url'
    source_name VARCHAR(500),          -- filename or URL
    source_index INTEGER,              -- index in attachments array

    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Embedding ( OpenAI text-embedding-3-small dimension)
    embedding public.vector(1536),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_message_chunks_session_id
ON flowmaestro.chat_interface_message_chunks(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_chunks_thread_id
ON flowmaestro.chat_interface_message_chunks(thread_id);

-- Vector similarity index (HNSW for fast approximate search)
-- We use public.vector_cosine_ops explicitly
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_chat_message_chunks_embedding') THEN
        CREATE INDEX idx_chat_message_chunks_embedding
        ON flowmaestro.chat_interface_message_chunks
        USING hnsw (embedding public.vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    END IF;
END $$;
