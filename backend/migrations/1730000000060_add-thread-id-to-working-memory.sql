-- Migration: Add thread_id to Agent Working Memory Table
-- Allows thread-scoped working memory in addition to global (per-user) memory

-- Add thread_id column (nullable - NULL means global memory)
ALTER TABLE flowmaestro.agent_working_memory
ADD COLUMN IF NOT EXISTS thread_id UUID DEFAULT NULL;

-- Drop the existing primary key
ALTER TABLE flowmaestro.agent_working_memory
DROP CONSTRAINT IF EXISTS agent_working_memory_pkey;

-- Add synthetic id column as primary key
ALTER TABLE flowmaestro.agent_working_memory
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Set id for existing rows (if any without id)
UPDATE flowmaestro.agent_working_memory
SET id = gen_random_uuid()
WHERE id IS NULL;

-- Make id NOT NULL and primary key
ALTER TABLE flowmaestro.agent_working_memory
ALTER COLUMN id SET NOT NULL;

ALTER TABLE flowmaestro.agent_working_memory
ADD CONSTRAINT agent_working_memory_pkey PRIMARY KEY (id);

-- Create unique index that handles NULL thread_id using COALESCE
-- NULL thread_id is treated as a sentinel value for "global" memory
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_working_memory_unique
ON flowmaestro.agent_working_memory (
    agent_id,
    user_id,
    COALESCE(thread_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Create index for thread lookups
CREATE INDEX IF NOT EXISTS idx_agent_working_memory_thread_id
ON flowmaestro.agent_working_memory (thread_id)
WHERE thread_id IS NOT NULL;

-- Add foreign key for thread_id (only if threads table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'flowmaestro' AND table_name = 'threads'
    ) THEN
        ALTER TABLE flowmaestro.agent_working_memory
        ADD CONSTRAINT fk_agent_working_memory_thread
        FOREIGN KEY (thread_id) REFERENCES flowmaestro.threads(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add comment
COMMENT ON COLUMN flowmaestro.agent_working_memory.thread_id IS 'Optional thread ID for thread-scoped memory. NULL means global memory shared across all threads.';
