-- Fix workspace slug uniqueness to exclude soft-deleted records
-- The original UNIQUE constraint on slug applied to ALL records including deleted ones
SET search_path TO flowmaestro, public;

-- Drop the existing unique constraint on slug
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_slug_key;

-- Drop the existing non-unique index
DROP INDEX IF EXISTS idx_workspaces_slug;

-- Create a partial unique index that only applies to non-deleted workspaces
-- This allows soft-deleted workspaces to have the same slug as new workspaces
CREATE UNIQUE INDEX idx_workspaces_slug_unique
    ON workspaces(slug)
    WHERE deleted_at IS NULL;
