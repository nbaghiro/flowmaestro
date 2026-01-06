-- Public API Infrastructure: API keys, outgoing webhooks, and delivery tracking
SET search_path TO flowmaestro, public;

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,

    -- Key storage (key shown once at creation, only hash stored)
    key_prefix VARCHAR(20) NOT NULL,      -- "fm_live_" + first 8 chars for identification
    key_hash VARCHAR(255) NOT NULL,        -- SHA-256 hash of full key

    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT '{}',   -- Array of scope strings

    -- Rate limits
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,

    -- Lifecycle
    expires_at TIMESTAMP NULL,             -- NULL = never expires
    last_used_at TIMESTAMP NULL,
    last_used_ip VARCHAR(45) NULL,         -- IPv6 compatible
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL
);

-- Indexes for api_keys
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true AND revoked_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- API KEY USAGE TABLE (for rate limiting analytics and audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_key_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NULL,

    -- Client info
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    -- Tracking
    request_id UUID NOT NULL,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for api_key_usage (optimized for rate limiting queries and cleanup)
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_created ON api_key_usage(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at DESC);

-- ============================================================================
-- OUTGOING WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,

    -- Endpoint
    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(255) NOT NULL,          -- For HMAC-SHA256 signature verification

    -- Subscription
    events TEXT[] NOT NULL DEFAULT '{}',   -- Event types to subscribe to

    -- Custom headers
    headers JSONB NULL,                    -- Additional headers to include

    -- State
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Indexes for outgoing_webhooks
CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_user_id ON outgoing_webhooks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_is_active ON outgoing_webhooks(is_active) WHERE is_active = true AND deleted_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_outgoing_webhooks_updated_at ON outgoing_webhooks;
CREATE TRIGGER update_outgoing_webhooks_updated_at BEFORE UPDATE ON outgoing_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE (delivery attempts tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id BIGSERIAL PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,

    -- Event info
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, success, failed, retrying
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,

    -- Timing
    last_attempt_at TIMESTAMP NULL,
    next_retry_at TIMESTAMP NULL,

    -- Response tracking
    response_status INTEGER NULL,
    response_body TEXT NULL,
    error_message TEXT NULL,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook_deliveries (optimized for retry processing)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_pending ON webhook_deliveries(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
