-- Add two-factor authentication support to users table
ALTER TABLE flowmaestro.users
    ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN two_factor_phone VARCHAR(20),
    ADD COLUMN two_factor_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN two_factor_secret VARCHAR(255); -- Reserved for TOTP future enhancement

-- Add indexes for 2FA fields
CREATE INDEX idx_users_two_factor_enabled ON flowmaestro.users(two_factor_enabled);
CREATE INDEX idx_users_two_factor_phone ON flowmaestro.users(two_factor_phone);

-- Table for storing hashed 2FA verification codes (SMS)
CREATE TABLE flowmaestro.two_factor_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of 6-digit code
    expires_at TIMESTAMP NOT NULL,   -- 5-minute expiry
    attempts INTEGER NOT NULL DEFAULT 0, -- Max 3 attempts
    verified_at TIMESTAMP,           -- NULL until verified
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),          -- IPv4 or IPv6
    user_agent TEXT
);

-- Indexes for two_factor_tokens
CREATE INDEX idx_two_factor_tokens_user_id ON flowmaestro.two_factor_tokens(user_id);
CREATE INDEX idx_two_factor_tokens_code_hash ON flowmaestro.two_factor_tokens(code_hash);
CREATE INDEX idx_two_factor_tokens_expires_at ON flowmaestro.two_factor_tokens(expires_at);

-- Table for storing hashed backup codes
CREATE TABLE flowmaestro.two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of backup code
    used_at TIMESTAMP,              -- NULL until used
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for two_factor_backup_codes
CREATE INDEX idx_two_factor_backup_codes_user_id ON flowmaestro.two_factor_backup_codes(user_id);
CREATE INDEX idx_two_factor_backup_codes_code_hash ON flowmaestro.two_factor_backup_codes(code_hash);

-- Comments for documentation
COMMENT ON COLUMN flowmaestro.users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN flowmaestro.users.two_factor_phone IS 'Phone number for SMS 2FA (E.164 format)';
COMMENT ON COLUMN flowmaestro.users.two_factor_phone_verified IS 'Whether the phone number has been verified';
COMMENT ON COLUMN flowmaestro.users.two_factor_secret IS 'TOTP secret for authenticator apps (future use)';
COMMENT ON TABLE flowmaestro.two_factor_tokens IS 'Temporary tokens for SMS 2FA verification (5-minute expiry)';
COMMENT ON TABLE flowmaestro.two_factor_backup_codes IS 'Single-use backup codes for 2FA recovery';
