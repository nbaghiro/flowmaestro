-- Migration: Remove last_tested_at Column from Connections
-- Created: 2024-12-20
-- Description: Remove unused last_tested_at column from connections table
--              Connection testing functionality has been removed from the codebase

-- Remove the last_tested_at column
ALTER TABLE flowmaestro.connections DROP COLUMN IF EXISTS last_tested_at;
