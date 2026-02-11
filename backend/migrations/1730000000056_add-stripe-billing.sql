-- Stripe Billing: Add subscription status tracking and payment history
SET search_path TO flowmaestro, public;

-- ============================================================================
-- 1. ADD SUBSCRIPTION STATUS TRACKING TO WORKSPACES
-- ============================================================================

-- Add subscription status and period tracking
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_trial_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Add constraint for subscription status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_status'
    ) THEN
        ALTER TABLE workspaces
        ADD CONSTRAINT chk_subscription_status
        CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'));
    END IF;
END $$;

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_status
    ON workspaces(subscription_status)
    WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. STRIPE CUSTOMER ID ON USERS (if not already present)
-- ============================================================================

-- Ensure stripe_customer_id column exists on users (may already exist from initial migration)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Ensure unique index exists (if not already)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 3. STRIPE EVENTS TABLE (Webhook Idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB,

    -- Constraints
    CONSTRAINT chk_stripe_event_id_format CHECK (stripe_event_id LIKE 'evt_%')
);

-- Indexes for stripe_events
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events(processed_at DESC);

-- ============================================================================
-- 4. PAYMENT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Stripe references
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    -- Payment details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    CONSTRAINT chk_payment_type CHECK (payment_type IN ('subscription', 'credit_pack', 'one_time'))
);

-- Indexes for payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_workspace ON payment_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_invoice ON payment_history(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_checkout ON payment_history(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
