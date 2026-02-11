-- Add admin role for system workflow access control
-- Only users with is_admin = true can access system workflows

ALTER TABLE flowmaestro.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Index for admin queries
CREATE INDEX idx_users_is_admin ON flowmaestro.users(is_admin) WHERE is_admin = TRUE;
