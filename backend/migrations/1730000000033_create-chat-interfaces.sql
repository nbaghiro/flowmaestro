-- Chat Interfaces: Public-facing embeddable chat interfaces linked to agents
SET search_path TO flowmaestro, public;

-- Chat Interface definitions
CREATE TABLE IF NOT EXISTS chat_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,

    -- Target (REQUIRED - agents only, unlike form interfaces)
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Branding - Header
    cover_type VARCHAR(20) DEFAULT 'color',  -- 'image' | 'color' | 'gradient'
    cover_value TEXT DEFAULT '#6366f1',      -- URL, hex color, or gradient CSS
    icon_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Branding - Theme
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    font_family VARCHAR(100) DEFAULT 'Inter',
    border_radius INTEGER DEFAULT 12,  -- px

    -- Chat Configuration
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    placeholder_text TEXT DEFAULT 'Type your message...',
    suggested_prompts JSONB DEFAULT '[]'::jsonb,  -- [{text: "...", icon?: "..."}]

    -- File Upload Configuration
    allow_file_upload BOOLEAN DEFAULT true,
    max_files INTEGER DEFAULT 3,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/*', 'text/*'],

    -- Session Configuration
    persistence_type VARCHAR(20) DEFAULT 'session',  -- 'session' | 'local_storage'
    session_timeout_minutes INTEGER DEFAULT 60,  -- 0 = no timeout

    -- Widget Configuration
    widget_position VARCHAR(20) DEFAULT 'bottom-right',  -- 'bottom-right' | 'bottom-left'
    widget_button_icon VARCHAR(50) DEFAULT 'chat',  -- 'chat' | 'message' | 'help' | custom URL
    widget_button_text VARCHAR(100),  -- Optional text next to icon
    widget_initial_state VARCHAR(20) DEFAULT 'collapsed',  -- 'collapsed' | 'expanded'

    -- Visibility & Access
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
    published_at TIMESTAMPTZ,

    -- Rate Limiting
    rate_limit_messages INTEGER DEFAULT 10,  -- per minute
    rate_limit_window_seconds INTEGER DEFAULT 60,

    -- Stats
    session_count BIGINT DEFAULT 0,
    message_count BIGINT DEFAULT 0,
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_chat_interface_user_slug UNIQUE (user_id, slug)
);

-- Indexes for chat_interfaces
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_user_id ON chat_interfaces(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_slug ON chat_interfaces(slug) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_agent ON chat_interfaces(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_status ON chat_interfaces(status) WHERE deleted_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_chat_interfaces_updated_at ON chat_interfaces;
CREATE TRIGGER update_chat_interfaces_updated_at BEFORE UPDATE ON chat_interfaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Chat Interface Sessions (anonymous visitors)
CREATE TABLE IF NOT EXISTS chat_interface_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interface_id UUID NOT NULL REFERENCES chat_interfaces(id) ON DELETE CASCADE,

    -- Session Identity (anonymous)
    session_token VARCHAR(255) NOT NULL,  -- Generated on first visit
    browser_fingerprint VARCHAR(255),  -- For session continuity

    -- Link to existing thread system
    thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

    -- Visitor Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(2),

    -- Session State
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'ended' | 'expired'
    message_count INTEGER DEFAULT 0,

    -- Local storage persistence token (if enabled)
    persistence_token VARCHAR(255),

    -- Timestamps
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_chat_session_token UNIQUE (interface_id, session_token)
);

-- Indexes for chat_interface_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_interface_id ON chat_interface_sessions(interface_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_token ON chat_interface_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_thread ON chat_interface_sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_fingerprint ON chat_interface_sessions(interface_id, browser_fingerprint);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_persistence_token ON chat_interface_sessions(interface_id, persistence_token) WHERE persistence_token IS NOT NULL;

-- Function to update session stats on chat_interfaces
CREATE OR REPLACE FUNCTION update_chat_interface_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_interfaces
        SET session_count = session_count + 1,
            last_activity_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.interface_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_interface_session_stats ON chat_interface_sessions;
CREATE TRIGGER trigger_update_chat_interface_session_stats
    AFTER INSERT ON chat_interface_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_interface_session_stats();

-- Function to update message count on chat_interfaces
CREATE OR REPLACE FUNCTION update_chat_interface_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message_count > OLD.message_count THEN
        UPDATE chat_interfaces
        SET message_count = message_count + (NEW.message_count - OLD.message_count),
            last_activity_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.interface_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_interface_message_count ON chat_interface_sessions;
CREATE TRIGGER trigger_update_chat_interface_message_count
    AFTER UPDATE ON chat_interface_sessions
    FOR EACH ROW
    WHEN (NEW.message_count > OLD.message_count)
    EXECUTE FUNCTION update_chat_interface_message_count();
