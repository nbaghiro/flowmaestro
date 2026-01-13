-- Workspaces: Multi-tenant workspace system for organization, billing, and collaboration
SET search_path TO flowmaestro, public;

-- ============================================================================
-- 1. USER TABLE UPDATES (Stripe Customer)
-- ============================================================================

-- Add Stripe customer ID to users (for billing)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add workspace preference columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_workspace_id UUID,
ADD COLUMN IF NOT EXISTS last_workspace_id UUID;

-- Index for Stripe customer lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer
    ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 2. WORKSPACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- Categorization
    category VARCHAR(50) NOT NULL DEFAULT 'team',  -- 'personal' | 'team'
    type VARCHAR(50) NOT NULL DEFAULT 'free',      -- 'free' | 'pro' | 'team'

    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Feature limits (derived from type, but stored for flexibility)
    max_workflows INTEGER NOT NULL DEFAULT 5,
    max_agents INTEGER NOT NULL DEFAULT 2,
    max_knowledge_bases INTEGER NOT NULL DEFAULT 1,
    max_kb_chunks INTEGER NOT NULL DEFAULT 100,
    max_members INTEGER NOT NULL DEFAULT 1,
    max_connections INTEGER NOT NULL DEFAULT 5,
    execution_history_days INTEGER NOT NULL DEFAULT 7,

    -- Billing (subscription only - customer is on owner's user record)
    stripe_subscription_id VARCHAR(255),
    billing_email VARCHAR(255),  -- optional override, defaults to owner email

    -- Settings (JSONB for flexibility)
    settings JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Constraints
    CONSTRAINT chk_workspace_category CHECK (category IN ('personal', 'team')),
    CONSTRAINT chk_workspace_type CHECK (type IN ('free', 'pro', 'team')),
    CONSTRAINT chk_workspace_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$')
);

-- Indexes for workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_category ON workspaces(category) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription
    ON workspaces(stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. WORKSPACE MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'viewer'

    -- Invitation tracking
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP,
    accepted_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_workspace_member UNIQUE(workspace_id, user_id),
    CONSTRAINT chk_member_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- Indexes for workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. WORKSPACE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',

    -- Invitation details
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id),
    message TEXT,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined' | 'expired'
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_invitation_role CHECK (role IN ('admin', 'member', 'viewer')),
    CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Indexes for workspace_invitations
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id) WHERE status = 'pending';

-- ============================================================================
-- 5. WORKSPACE CREDITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Balances by type (for expiration tracking)
    subscription_balance INTEGER NOT NULL DEFAULT 0,
    purchased_balance INTEGER NOT NULL DEFAULT 0,
    bonus_balance INTEGER NOT NULL DEFAULT 0,

    -- Reserved credits (during execution)
    reserved INTEGER NOT NULL DEFAULT 0,

    -- Expiration tracking
    subscription_expires_at TIMESTAMP,

    -- Lifetime statistics
    lifetime_allocated INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_workspace_credits UNIQUE(workspace_id),
    CONSTRAINT chk_subscription_balance CHECK (subscription_balance >= 0),
    CONSTRAINT chk_purchased_balance CHECK (purchased_balance >= 0),
    CONSTRAINT chk_bonus_balance CHECK (bonus_balance >= 0),
    CONSTRAINT chk_reserved CHECK (reserved >= 0)
);

-- Index for workspace_credits
CREATE INDEX IF NOT EXISTS idx_workspace_credits_workspace_id ON workspace_credits(workspace_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workspace_credits_updated_at ON workspace_credits;
CREATE TRIGGER update_workspace_credits_updated_at BEFORE UPDATE ON workspace_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get available credits
CREATE OR REPLACE FUNCTION get_available_credits(ws_id UUID)
RETURNS INTEGER AS $$
    SELECT GREATEST(0,
        COALESCE(subscription_balance, 0) +
        COALESCE(purchased_balance, 0) +
        COALESCE(bonus_balance, 0) -
        COALESCE(reserved, 0)
    )
    FROM flowmaestro.workspace_credits
    WHERE workspace_id = ws_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 6. CREDIT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),  -- who performed the action (null for system actions)

    -- Transaction details
    amount INTEGER NOT NULL,  -- positive for credits, negative for usage
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- 'subscription' | 'purchase' | 'usage' | 'refund' | 'bonus' | 'expiration'

    -- Operation tracking
    operation_type VARCHAR(100),  -- 'workflow_execution' | 'agent_session' | etc.
    operation_id UUID,  -- Reference to the specific execution/session
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('subscription', 'purchase', 'usage', 'refund', 'bonus', 'expiration'))
);

-- Indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace ON credit_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_operation ON credit_transactions(operation_type, operation_id) WHERE operation_id IS NOT NULL;

-- ============================================================================
-- 7. ADD workspace_id TO ALL RESOURCE TABLES (nullable initially)
-- ============================================================================

-- Core Resources
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE database_connections ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Organization & Interfaces
ALTER TABLE folders ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE form_interfaces ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE chat_interfaces ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Automation & API
ALTER TABLE workflow_triggers ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE outgoing_webhooks ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Analytics & Audit (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flowmaestro' AND table_name = 'daily_analytics') THEN
        ALTER TABLE daily_analytics ADD COLUMN IF NOT EXISTS workspace_id UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flowmaestro' AND table_name = 'hourly_analytics') THEN
        ALTER TABLE hourly_analytics ADD COLUMN IF NOT EXISTS workspace_id UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flowmaestro' AND table_name = 'model_usage_stats') THEN
        ALTER TABLE model_usage_stats ADD COLUMN IF NOT EXISTS workspace_id UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flowmaestro' AND table_name = 'safety_logs') THEN
        ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS workspace_id UUID;
    END IF;
END $$;

-- ============================================================================
-- 8. CREATE INDEXES FOR workspace_id ON RESOURCE TABLES
-- ============================================================================

-- Core Resources
CREATE INDEX IF NOT EXISTS idx_workflows_workspace_id ON workflows(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_threads_workspace_id ON threads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_connections_workspace_id ON connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_database_connections_workspace_id ON database_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_workspace_id ON knowledge_bases(workspace_id);

-- Organization & Interfaces
CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON folders(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_interfaces_workspace_id ON form_interfaces(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_workspace_id ON chat_interfaces(workspace_id) WHERE deleted_at IS NULL;

-- Automation & API
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workspace_id ON workflow_triggers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_workspace_id ON outgoing_webhooks(workspace_id);

-- ============================================================================
-- 9. ADD FOREIGN KEY CONSTRAINTS FOR USER WORKSPACE PREFERENCES
-- ============================================================================

-- Add foreign key constraints for user workspace preferences
-- (These will be enabled after data migration populates workspace_id)
-- ALTER TABLE users ADD CONSTRAINT fk_users_default_workspace
--     FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
-- ALTER TABLE users ADD CONSTRAINT fk_users_last_workspace
--     FOREIGN KEY (last_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================================================
-- NOTES FOR DATA MIGRATION (Phase 10)
-- ============================================================================
-- After deploying this migration and the application code:
-- 1. Run data migration to create personal workspaces for existing users
-- 2. Update all resources to point to owner's workspace
-- 3. Then run a follow-up migration to:
--    a. Add NOT NULL constraints to workspace_id columns
--    b. Add foreign key constraints to workspace_id columns
--    c. Add foreign key constraints for user workspace preferences
