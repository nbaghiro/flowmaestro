-- Migration: Add category column to knowledge_bases table
-- This stores the category chosen during KB creation for consistent color styling

-- Add category column (nullable to support existing KBs)
ALTER TABLE flowmaestro.knowledge_bases
ADD COLUMN category VARCHAR(50) DEFAULT NULL;

-- Add index for potential filtering by category
CREATE INDEX idx_knowledge_bases_category ON flowmaestro.knowledge_bases(category);

COMMENT ON COLUMN flowmaestro.knowledge_bases.category IS 'Category ID from KB_CATEGORIES (e.g., product-docs, faq-help, research, etc.)';
