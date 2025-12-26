-- Archive execution_spans table for OpenTelemetry migration
--
-- This migration archives the execution_spans table since spans are now
-- exported to GCP Cloud Trace via OpenTelemetry instead of being stored
-- in PostgreSQL.
--
-- The table is renamed (not dropped) to preserve historical data for reference.
-- The analytics aggregation tables (hourly_analytics, daily_analytics) are also
-- archived since they depend on execution_spans data.

-- Up Migration

-- Rename execution_spans table to archived_execution_spans
ALTER TABLE IF EXISTS flowmaestro.execution_spans
RENAME TO archived_execution_spans;

-- Rename related indexes
ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_trace_id
RENAME TO idx_archived_execution_spans_trace_id;

ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_parent_span_id
RENAME TO idx_archived_execution_spans_parent_span_id;

ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_entity_id
RENAME TO idx_archived_execution_spans_entity_id;

ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_span_type
RENAME TO idx_archived_execution_spans_span_type;

ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_started_at
RENAME TO idx_archived_execution_spans_started_at;

ALTER INDEX IF EXISTS flowmaestro.idx_execution_spans_status
RENAME TO idx_archived_execution_spans_status;

-- Add a comment explaining why this table is archived
COMMENT ON TABLE flowmaestro.archived_execution_spans IS
'Archived execution_spans table. Spans are now exported to GCP Cloud Trace via OpenTelemetry.
This table contains historical data from before the migration (December 2025).
Safe to drop after confirming data is no longer needed.';

-- Rename hourly_analytics table
ALTER TABLE IF EXISTS flowmaestro.hourly_analytics
RENAME TO archived_hourly_analytics;

COMMENT ON TABLE flowmaestro.archived_hourly_analytics IS
'Archived hourly_analytics table. Analytics are now derived from GCP Cloud Monitoring metrics.
This table contains historical aggregated data from before the migration (December 2025).
Safe to drop after confirming data is no longer needed.';

-- Rename daily_analytics table
ALTER TABLE IF EXISTS flowmaestro.daily_analytics
RENAME TO archived_daily_analytics;

COMMENT ON TABLE flowmaestro.archived_daily_analytics IS
'Archived daily_analytics table. Analytics are now derived from GCP Cloud Monitoring metrics.
This table contains historical aggregated data from before the migration (December 2025).
Safe to drop after confirming data is no longer needed.';

-- Down Migration

-- ALTER TABLE IF EXISTS flowmaestro.archived_execution_spans
-- RENAME TO execution_spans;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_trace_id
-- RENAME TO idx_execution_spans_trace_id;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_parent_span_id
-- RENAME TO idx_execution_spans_parent_span_id;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_entity_id
-- RENAME TO idx_execution_spans_entity_id;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_span_type
-- RENAME TO idx_execution_spans_span_type;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_started_at
-- RENAME TO idx_execution_spans_started_at;

-- ALTER INDEX IF EXISTS flowmaestro.idx_archived_execution_spans_status
-- RENAME TO idx_execution_spans_status;

-- COMMENT ON TABLE flowmaestro.execution_spans IS NULL;

-- ALTER TABLE IF EXISTS flowmaestro.archived_hourly_analytics
-- RENAME TO hourly_analytics;

-- COMMENT ON TABLE flowmaestro.hourly_analytics IS NULL;

-- ALTER TABLE IF EXISTS flowmaestro.archived_daily_analytics
-- RENAME TO daily_analytics;

-- COMMENT ON TABLE flowmaestro.daily_analytics IS NULL;
