-- Migration: Move seeded personas off a retired model id
-- Every seeded persona definition used claude-sonnet-4-20250514, which the Anthropic API
-- no longer serves (404 not_found_error), so every persona run failed at its first LLM
-- call. The seed script now uses claude-sonnet-4-5-20250929; update existing rows.

UPDATE flowmaestro.persona_definitions
SET model = 'claude-sonnet-4-5-20250929', updated_at = CURRENT_TIMESTAMP
WHERE provider = 'anthropic' AND model = 'claude-sonnet-4-20250514';
