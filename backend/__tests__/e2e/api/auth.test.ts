/**
 * Auth API E2E Tests
 *
 * Tests authentication flow against a real PostgreSQL database
 * using Testcontainers. Covers user registration, login, password reset,
 * email verification, and two-factor authentication.
 */

import * as crypto from "crypto";
import { seedUser, seedWorkspace } from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

// Helper to hash tokens like the production code does (SHA-256)
function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Helper to hash passwords using PBKDF2 (no external dependencies)
function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return `pbkdf2:${salt}:${hash}`;
}

// Helper to verify passwords
function verifyPassword(password: string, storedHash: string): boolean {
    const [, salt, hash] = storedHash.split(":");
    const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return hash === testHash;
}

describe("Auth API (Real PostgreSQL)", () => {
    // ========================================================================
    // USER REGISTRATION
    // ========================================================================

    describe("user registration", () => {
        it("should create user in database", async () => {
            await withTransaction(async (client) => {
                const email = `new-user-${Date.now()}@example.com`;
                const passwordHash = hashPassword("SecurePassword123!");

                // Simulate user registration
                const result = await client.query(
                    `INSERT INTO flowmaestro.users
                     (email, password_hash, name, email_verified)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, email, name, email_verified`,
                    [email, passwordHash, "New User", false]
                );

                expect(result.rows[0].email).toBe(email);
                expect(result.rows[0].name).toBe("New User");
                expect(result.rows[0].email_verified).toBe(false);
            });
        });

        it("should reject duplicate email registration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email: "existing@example.com" });

                // Try to create another user with same email
                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.users (email, password_hash, name)
                         VALUES ($1, $2, $3)`,
                        [user.email, "hash", "Duplicate User"]
                    )
                ).rejects.toThrow(/duplicate/i);
            });
        });

        it("should create personal workspace on registration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                // Create personal workspace for user (simulating registration flow)
                await seedWorkspace(client, user.id, { name: "Personal Workspace" });

                // Check that a personal workspace was created
                const result = await client.query(
                    `SELECT ws.*, wm.role
                     FROM flowmaestro.workspaces ws
                     JOIN flowmaestro.workspace_members wm ON ws.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND wm.role = 'owner'`,
                    [user.id]
                );

                expect(result.rows.length).toBeGreaterThanOrEqual(1);
            });
        });

        it("should store hashed password", async () => {
            await withTransaction(async (client) => {
                const password = "SecurePassword123!";
                const passwordHash = hashPassword(password);

                await client.query(
                    `INSERT INTO flowmaestro.users
                     (email, password_hash, name)
                     VALUES ($1, $2, $3)`,
                    ["test-hash@example.com", passwordHash, "Test User"]
                );

                const result = await client.query(
                    "SELECT password_hash FROM flowmaestro.users WHERE email = $1",
                    ["test-hash@example.com"]
                );

                // Password should be hashed, not plain text
                expect(result.rows[0].password_hash).not.toBe(password);
                expect(result.rows[0].password_hash.startsWith("pbkdf2:")).toBe(true);

                // Verify password can be validated
                const isValid = verifyPassword(password, result.rows[0].password_hash);
                expect(isValid).toBe(true);
            });
        });
    });

    // ========================================================================
    // LOGIN
    // ========================================================================

    describe("login with credentials", () => {
        it("should find user by email for login", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, {
                    email: "login-test@example.com"
                });

                const result = await client.query(
                    `SELECT id, email, password_hash, email_verified, two_factor_enabled
                     FROM flowmaestro.users
                     WHERE email = $1`,
                    [user.email]
                );

                expect(result.rows[0].id).toBe(user.id);
                expect(result.rows[0].email).toBe("login-test@example.com");
            });
        });

        it("should track last login timestamp", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                // Simulate login - update last_login_at
                await client.query(
                    `UPDATE flowmaestro.users
                     SET last_login_at = NOW()
                     WHERE id = $1`,
                    [user.id]
                );

                const result = await client.query(
                    "SELECT last_login_at FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].last_login_at).not.toBeNull();
            });
        });

        it("should reject login for non-existent user", async () => {
            await withTransaction(async (client) => {
                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE email = $1",
                    ["nonexistent@example.com"]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // PASSWORD RESET
    // ========================================================================

    describe("password reset flow", () => {
        it("should store password reset token hash", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const resetToken = "reset-token-" + Date.now();
                const tokenHash = hashToken(resetToken);
                const expiresAt = new Date(Date.now() + 3600000); // 1 hour

                // Store hashed reset token
                await client.query(
                    `INSERT INTO flowmaestro.password_reset_tokens
                     (user_id, token_hash, expires_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, tokenHash, expiresAt]
                );

                // Verify token stored
                const result = await client.query(
                    `SELECT * FROM flowmaestro.password_reset_tokens
                     WHERE user_id = $1 AND token_hash = $2`,
                    [user.id, tokenHash]
                );

                expect(result.rows[0].token_hash).toBe(tokenHash);
                expect(result.rows[0].used_at).toBeNull();
            });
        });

        it("should validate unexpired token", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const resetToken = "valid-token";
                const tokenHash = hashToken(resetToken);
                const expiresAt = new Date(Date.now() + 3600000).toISOString();

                await client.query(
                    `INSERT INTO flowmaestro.password_reset_tokens
                     (user_id, token_hash, expires_at)
                     VALUES ($1, $2, $3::timestamp)`,
                    [user.id, tokenHash, expiresAt]
                );

                // Check token is valid (use current_timestamp for consistency)
                const result = await client.query(
                    `SELECT * FROM flowmaestro.password_reset_tokens
                     WHERE token_hash = $1
                     AND expires_at > CURRENT_TIMESTAMP
                     AND used_at IS NULL`,
                    [tokenHash]
                );

                expect(result.rows).toHaveLength(1);
            });
        });

        it("should reject expired token", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const resetToken = "expired-token";
                const tokenHash = hashToken(resetToken);
                const expiresAt = new Date(Date.now() - 3600000); // Expired 1 hour ago

                await client.query(
                    `INSERT INTO flowmaestro.password_reset_tokens
                     (user_id, token_hash, expires_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, tokenHash, expiresAt]
                );

                // Check token is invalid (expired)
                const result = await client.query(
                    `SELECT * FROM flowmaestro.password_reset_tokens
                     WHERE token_hash = $1
                     AND expires_at > NOW()
                     AND used_at IS NULL`,
                    [tokenHash]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should mark token as used after password reset", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const resetToken = "use-once-token";
                const tokenHash = hashToken(resetToken);
                const expiresAt = new Date(Date.now() + 3600000);

                await client.query(
                    `INSERT INTO flowmaestro.password_reset_tokens
                     (user_id, token_hash, expires_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, tokenHash, expiresAt]
                );

                // Mark as used
                await client.query(
                    `UPDATE flowmaestro.password_reset_tokens
                     SET used_at = NOW()
                     WHERE token_hash = $1`,
                    [tokenHash]
                );

                // Token should no longer be valid
                const result = await client.query(
                    `SELECT * FROM flowmaestro.password_reset_tokens
                     WHERE token_hash = $1
                     AND used_at IS NULL`,
                    [tokenHash]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // EMAIL VERIFICATION
    // ========================================================================

    describe("email verification", () => {
        it("should store email verification token hash", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email_verified: false });
                const verifyToken = "verify-token-" + Date.now();
                const tokenHash = hashToken(verifyToken);
                const expiresAt = new Date(Date.now() + 86400000); // 24 hours

                await client.query(
                    `INSERT INTO flowmaestro.email_verification_tokens
                     (user_id, email, token_hash, expires_at)
                     VALUES ($1, $2, $3, $4)`,
                    [user.id, user.email, tokenHash, expiresAt]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.email_verification_tokens
                     WHERE user_id = $1`,
                    [user.id]
                );

                expect(result.rows[0].token_hash).toBe(tokenHash);
                expect(result.rows[0].email).toBe(user.email);
            });
        });

        it("should update email_verified on successful verification", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email_verified: false });

                // Verify email
                await client.query(
                    `UPDATE flowmaestro.users
                     SET email_verified = true, email_verified_at = NOW()
                     WHERE id = $1`,
                    [user.id]
                );

                const result = await client.query(
                    "SELECT email_verified, email_verified_at FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].email_verified).toBe(true);
                expect(result.rows[0].email_verified_at).not.toBeNull();
            });
        });

        it("should handle token expiry", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email_verified: false });
                const expiredToken = "expired-verify-token";
                const tokenHash = hashToken(expiredToken);
                const expiresAt = new Date(Date.now() - 86400000); // Expired yesterday

                await client.query(
                    `INSERT INTO flowmaestro.email_verification_tokens
                     (user_id, email, token_hash, expires_at)
                     VALUES ($1, $2, $3, $4)`,
                    [user.id, user.email, tokenHash, expiresAt]
                );

                // Find valid tokens only
                const result = await client.query(
                    `SELECT * FROM flowmaestro.email_verification_tokens
                     WHERE token_hash = $1 AND expires_at > NOW()`,
                    [tokenHash]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should mark token as verified", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email_verified: false });
                const verifyToken = "verify-once-token";
                const tokenHash = hashToken(verifyToken);
                const expiresAt = new Date(Date.now() + 86400000);

                await client.query(
                    `INSERT INTO flowmaestro.email_verification_tokens
                     (user_id, email, token_hash, expires_at)
                     VALUES ($1, $2, $3, $4)`,
                    [user.id, user.email, tokenHash, expiresAt]
                );

                // Mark as verified
                await client.query(
                    `UPDATE flowmaestro.email_verification_tokens
                     SET verified_at = NOW()
                     WHERE token_hash = $1`,
                    [tokenHash]
                );

                // Token should be marked as used
                const result = await client.query(
                    `SELECT * FROM flowmaestro.email_verification_tokens
                     WHERE token_hash = $1 AND verified_at IS NULL`,
                    [tokenHash]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // TWO-FACTOR AUTHENTICATION
    // ========================================================================

    describe("two-factor authentication", () => {
        it("should enable 2FA for user", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { two_factor_enabled: false });
                const secret = "JBSWY3DPEHPK3PXP"; // TOTP secret

                await client.query(
                    `UPDATE flowmaestro.users
                     SET two_factor_enabled = true,
                         two_factor_secret = $2
                     WHERE id = $1`,
                    [user.id, secret]
                );

                const result = await client.query(
                    `SELECT two_factor_enabled, two_factor_secret
                     FROM flowmaestro.users WHERE id = $1`,
                    [user.id]
                );

                expect(result.rows[0].two_factor_enabled).toBe(true);
                expect(result.rows[0].two_factor_secret).toBe(secret);
            });
        });

        it("should store 2FA verification code", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { two_factor_enabled: true });
                const code = "123456";
                const codeHash = hashToken(code);
                const expiresAt = new Date(Date.now() + 300000); // 5 minutes

                await client.query(
                    `INSERT INTO flowmaestro.two_factor_tokens
                     (user_id, code_hash, expires_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, codeHash, expiresAt]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.two_factor_tokens
                     WHERE user_id = $1 AND code_hash = $2`,
                    [user.id, codeHash]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].verified_at).toBeNull();
            });
        });

        it("should track 2FA verification attempts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { two_factor_enabled: true });
                const code = "123456";
                const codeHash = hashToken(code);
                const expiresAt = new Date(Date.now() + 300000);

                await client.query(
                    `INSERT INTO flowmaestro.two_factor_tokens
                     (user_id, code_hash, expires_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, codeHash, expiresAt]
                );

                // Increment attempts
                await client.query(
                    `UPDATE flowmaestro.two_factor_tokens
                     SET attempts = attempts + 1
                     WHERE user_id = $1 AND code_hash = $2`,
                    [user.id, codeHash]
                );

                const result = await client.query(
                    `SELECT attempts FROM flowmaestro.two_factor_tokens
                     WHERE user_id = $1 AND code_hash = $2`,
                    [user.id, codeHash]
                );

                expect(result.rows[0].attempts).toBe(1);
            });
        });

        it("should store backup codes", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { two_factor_enabled: true });

                const backupCodes = [
                    "BACKUP-001",
                    "BACKUP-002",
                    "BACKUP-003",
                    "BACKUP-004",
                    "BACKUP-005"
                ];

                // Store backup codes with SHA-256 hash
                for (const code of backupCodes) {
                    await client.query(
                        `INSERT INTO flowmaestro.two_factor_backup_codes
                         (user_id, code_hash)
                         VALUES ($1, $2)`,
                        [user.id, hashToken(code)]
                    );
                }

                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.two_factor_backup_codes
                     WHERE user_id = $1 AND used_at IS NULL`,
                    [user.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(5);
            });
        });

        it("should mark backup code as used", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { two_factor_enabled: true });
                const code = "USE-THIS-CODE";
                const codeHash = hashToken(code);

                await client.query(
                    `INSERT INTO flowmaestro.two_factor_backup_codes
                     (user_id, code_hash)
                     VALUES ($1, $2)`,
                    [user.id, codeHash]
                );

                // Mark as used
                await client.query(
                    `UPDATE flowmaestro.two_factor_backup_codes
                     SET used_at = NOW()
                     WHERE user_id = $1 AND code_hash = $2`,
                    [user.id, codeHash]
                );

                // Code should no longer be available
                const result = await client.query(
                    `SELECT * FROM flowmaestro.two_factor_backup_codes
                     WHERE user_id = $1 AND used_at IS NULL`,
                    [user.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // PHONE 2FA
    // ========================================================================

    describe("phone-based 2FA", () => {
        it("should set phone number for 2FA", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const phoneNumber = "+14155551234";

                await client.query(
                    `UPDATE flowmaestro.users
                     SET two_factor_phone = $2
                     WHERE id = $1`,
                    [user.id, phoneNumber]
                );

                const result = await client.query(
                    `SELECT two_factor_phone, two_factor_phone_verified
                     FROM flowmaestro.users WHERE id = $1`,
                    [user.id]
                );

                expect(result.rows[0].two_factor_phone).toBe(phoneNumber);
                expect(result.rows[0].two_factor_phone_verified).toBe(false);
            });
        });

        it("should verify phone number", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await client.query(
                    `UPDATE flowmaestro.users
                     SET two_factor_phone = $2,
                         two_factor_phone_verified = true
                     WHERE id = $1`,
                    [user.id, "+14155551234"]
                );

                const result = await client.query(
                    `SELECT two_factor_phone_verified
                     FROM flowmaestro.users WHERE id = $1`,
                    [user.id]
                );

                expect(result.rows[0].two_factor_phone_verified).toBe(true);
            });
        });
    });
});
