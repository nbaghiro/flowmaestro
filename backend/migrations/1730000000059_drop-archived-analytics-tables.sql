-- Drop Archived Analytics Tables
--
-- This migration removes all archived analytics tables that were replaced
-- by OpenTelemetry metrics exported to GCP Cloud Monitoring.
--
-- Tables being dropped:
-- - archived_execution_spans (renamed from execution_spans in migration 030)
-- - archived_hourly_analytics (renamed from hourly_analytics in migration 030)
-- - archived_daily_analytics (renamed from daily_analytics in migration 030)
-- - model_usage_stats (never archived but no longer used)
-- - recent_activity_summary (materialized view, depends on archived tables)
--
-- Analytics are now served via:
-- - GCP Cloud Trace for distributed tracing
-- - GCP Cloud Monitoring for metrics (via monitoring-query.ts)

-- Up Migration

-- Drop materialized view first (depends on daily_analytics)
DROP MATERIALIZED VIEW IF EXISTS flowmaestro.recent_activity_summary;

-- Drop triggers (they reference tables we're about to drop)
DROP TRIGGER IF EXISTS daily_analytics_updated_at ON flowmaestro.archived_daily_analytics;
DROP TRIGGER IF EXISTS hourly_analytics_updated_at ON flowmaestro.archived_hourly_analytics;
DROP TRIGGER IF EXISTS model_usage_stats_updated_at ON flowmaestro.model_usage_stats;

-- Drop the function used by triggers
DROP FUNCTION IF EXISTS flowmaestro.update_analytics_updated_at();

-- Drop archived tables
DROP TABLE IF EXISTS flowmaestro.archived_execution_spans;
DROP TABLE IF EXISTS flowmaestro.archived_hourly_analytics;
DROP TABLE IF EXISTS flowmaestro.archived_daily_analytics;

-- Drop model_usage_stats (was never archived but is no longer used)
DROP TABLE IF EXISTS flowmaestro.model_usage_stats;

-- Down Migration (commented out - data is not recoverable)
-- To restore, re-run migrations 010, 016, and 030 in sequence
