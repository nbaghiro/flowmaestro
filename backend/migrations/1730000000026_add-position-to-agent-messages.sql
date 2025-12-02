-- Add position column to agent_messages table to track message order
ALTER TABLE flowmaestro.agent_messages 
ADD COLUMN position INTEGER;

-- Create index for efficient ordering retrieval
CREATE INDEX idx_agent_messages_thread_position 
ON flowmaestro.agent_messages(thread_id, position);

-- Comment on column
COMMENT ON COLUMN flowmaestro.agent_messages.position IS 'Order of the message within the thread';
