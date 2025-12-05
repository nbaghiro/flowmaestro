-- Migration: Rename conversation_history to thread_history
-- Description: Rename the conversation_history column to thread_history for consistency with thread terminology
-- Date: 2025-12-04

-- Rename column from conversation_history to thread_history
ALTER TABLE flowmaestro.agent_executions
RENAME COLUMN conversation_history TO thread_history;

-- Add comment to document the change
COMMENT ON COLUMN flowmaestro.agent_executions.thread_history IS 'Thread message history stored as JSONB array of ThreadMessage objects';
