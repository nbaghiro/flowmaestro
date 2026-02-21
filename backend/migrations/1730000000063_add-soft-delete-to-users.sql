-- Migration: Add soft delete support to users table
-- This enables user deactivation while preserving audit trails

-- Add deleted_at column for soft delete
ALTER TABLE flowmaestro.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create partial index for efficient queries on non-deleted users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON flowmaestro.users(deleted_at) WHERE deleted_at IS NULL;

-- Update unique constraint on email to only apply to non-deleted users
-- This allows soft-deleted users' emails to be reused
ALTER TABLE flowmaestro.users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON flowmaestro.users(email) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN flowmaestro.users.deleted_at IS 'Timestamp when user was soft deleted. NULL indicates active user.';
