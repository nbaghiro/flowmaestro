-- Add subfolder support: parent_id, depth, path columns with triggers for hierarchy management
SET search_path TO flowmaestro, public;

-- Add parent_id column for folder hierarchy
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Add depth column to track nesting level (0 = root, max 4 for 5 levels total)
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- Add materialized path for efficient ancestor queries (e.g., '/uuid1/uuid2/uuid3')
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS path TEXT DEFAULT '';

-- Index for parent lookups (getting children of a folder)
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id) WHERE deleted_at IS NULL;

-- Index for path-based queries (ancestor lookups)
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path) WHERE deleted_at IS NULL;

-- Constraint to prevent self-referencing (folder cannot be its own parent)
ALTER TABLE folders
ADD CONSTRAINT check_no_self_parent CHECK (id != parent_id);

-- Drop the old unique constraint that was per-user globally
ALTER TABLE folders DROP CONSTRAINT IF EXISTS unique_folder_name_per_user;

-- Add new constraint: unique name per user AND parent (null parent = root level)
-- Using COALESCE to treat NULL parent_id as a known value for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS unique_folder_name_per_parent
ON folders (user_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID), LOWER(name))
WHERE deleted_at IS NULL;

-- Function to update materialized path and depth when parent changes
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_depth INTEGER;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root folder: path is just its own ID
        NEW.path := '/' || NEW.id::TEXT;
        NEW.depth := 0;
    ELSE
        -- Get parent's path and depth
        SELECT path, depth INTO parent_path, parent_depth
        FROM flowmaestro.folders
        WHERE id = NEW.parent_id AND deleted_at IS NULL;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent folder not found or deleted';
        END IF;

        -- Enforce max depth of 4 (0-indexed, so 5 levels total: 0, 1, 2, 3, 4)
        IF parent_depth >= 4 THEN
            RAISE EXCEPTION 'Maximum folder nesting depth (5 levels) exceeded';
        END IF;

        NEW.path := parent_path || '/' || NEW.id::TEXT;
        NEW.depth := parent_depth + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain path on insert or when parent_id changes
DROP TRIGGER IF EXISTS maintain_folder_path ON folders;
CREATE TRIGGER maintain_folder_path
BEFORE INSERT OR UPDATE OF parent_id ON folders
FOR EACH ROW EXECUTE FUNCTION update_folder_path();

-- Function to prevent circular references (moving folder into its own descendant)
CREATE OR REPLACE FUNCTION check_folder_no_cycle()
RETURNS TRIGGER AS $$
DECLARE
    is_descendant BOOLEAN;
BEGIN
    IF NEW.parent_id IS NOT NULL AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        -- Check if the new parent is a descendant of this folder
        WITH RECURSIVE descendants AS (
            SELECT id FROM flowmaestro.folders
            WHERE parent_id = NEW.id AND deleted_at IS NULL
            UNION ALL
            SELECT f.id FROM flowmaestro.folders f
            INNER JOIN descendants d ON f.parent_id = d.id
            WHERE f.deleted_at IS NULL
        )
        SELECT EXISTS(SELECT 1 FROM descendants WHERE id = NEW.parent_id) INTO is_descendant;

        IF is_descendant THEN
            RAISE EXCEPTION 'Cannot move folder into its own descendant (circular reference)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent cycles (only on UPDATE, not INSERT since new folders can't have descendants)
DROP TRIGGER IF EXISTS prevent_folder_cycle ON folders;
CREATE TRIGGER prevent_folder_cycle
BEFORE UPDATE OF parent_id ON folders
FOR EACH ROW EXECUTE FUNCTION check_folder_no_cycle();

-- Function to update descendant paths when a folder moves
CREATE OR REPLACE FUNCTION cascade_folder_path_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only cascade if the old path was not empty (avoid issues during initial migration)
    -- and the path actually changed
    IF OLD.path IS DISTINCT FROM NEW.path AND OLD.path IS NOT NULL AND OLD.path != '' THEN
        -- Update all descendants' paths and depths
        UPDATE flowmaestro.folders
        SET path = NEW.path || SUBSTRING(path FROM LENGTH(OLD.path) + 1),
            depth = NEW.depth + (depth - OLD.depth)
        WHERE path LIKE OLD.path || '/%'
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Initialize existing folders with path and depth BEFORE creating the cascade trigger
-- This ensures the initial data migration doesn't trigger cascading updates
UPDATE flowmaestro.folders
SET path = '/' || id::TEXT, depth = 0
WHERE parent_id IS NULL AND deleted_at IS NULL AND (path IS NULL OR path = '');

-- Now create the cascade trigger (after initial data is set)
DROP TRIGGER IF EXISTS cascade_folder_paths ON folders;
CREATE TRIGGER cascade_folder_paths
AFTER UPDATE OF path ON folders
FOR EACH ROW EXECUTE FUNCTION cascade_folder_path_update();
