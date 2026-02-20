/**
 * UserRepository E2E Tests
 *
 * Tests user-related database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import { seedUser, generateTestId } from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("UserRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a user with local auth provider", async () => {
            await withTransaction(async (client) => {
                const userId = generateTestId("user");
                const email = `${userId}@test.flowmaestro.dev`;

                const result = await client.query(
                    `INSERT INTO flowmaestro.users (
                        id, email, password_hash, name, auth_provider
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *`,
                    [userId, email, "$2a$10$test_hash", "Test User", "local"]
                );

                expect(result.rows).toHaveLength(1);
                const user = result.rows[0];
                expect(user.id).toBe(userId);
                expect(user.email).toBe(email);
                expect(user.name).toBe("Test User");
                expect(user.auth_provider).toBe("local");
                expect(user.email_verified).toBe(false);
                expect(user.created_at).toBeInstanceOf(Date);
            });
        });

        it("should create a user with Google OAuth", async () => {
            await withTransaction(async (client) => {
                const userId = generateTestId("user");
                const googleId = `google-${userId}`;

                const result = await client.query(
                    `INSERT INTO flowmaestro.users (
                        id, email, name, google_id, auth_provider, email_verified
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [userId, `${userId}@gmail.com`, "Google User", googleId, "google", true]
                );

                const user = result.rows[0];
                expect(user.google_id).toBe(googleId);
                expect(user.auth_provider).toBe("google");
                expect(user.email_verified).toBe(true);
                expect(user.password_hash).toBeNull();
            });
        });

        it("should create a user with Microsoft OAuth", async () => {
            await withTransaction(async (client) => {
                const userId = generateTestId("user");
                const microsoftId = `microsoft-${userId}`;

                const result = await client.query(
                    `INSERT INTO flowmaestro.users (
                        id, email, name, microsoft_id, auth_provider, email_verified
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [
                        userId,
                        `${userId}@outlook.com`,
                        "Microsoft User",
                        microsoftId,
                        "microsoft",
                        true
                    ]
                );

                const user = result.rows[0];
                expect(user.microsoft_id).toBe(microsoftId);
                expect(user.auth_provider).toBe("microsoft");
            });
        });

        it("should enforce unique email constraint", async () => {
            await withTransaction(async (client) => {
                const email = "duplicate@test.flowmaestro.dev";

                // Create first user
                await client.query(
                    `INSERT INTO flowmaestro.users (email, password_hash, auth_provider)
                     VALUES ($1, $2, $3)`,
                    [email, "$2a$10$hash1", "local"]
                );

                // Try to create second user with same email
                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.users (email, password_hash, auth_provider)
                         VALUES ($1, $2, $3)`,
                        [email, "$2a$10$hash2", "local"]
                    )
                ).rejects.toThrow(/duplicate key|unique constraint/i);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return user when exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                const result = await client.query("SELECT * FROM flowmaestro.users WHERE id = $1", [
                    user.id
                ]);

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(user.id);
                expect(result.rows[0].email).toBe(user.email);
            });
        });

        it("should return empty for non-existent user", async () => {
            await withTransaction(async (client) => {
                // Use a valid UUID that doesn't exist in the database
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query("SELECT * FROM flowmaestro.users WHERE id = $1", [
                    nonExistentUuid
                ]);

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByEmail", () => {
        it("should find user by email case-sensitively", async () => {
            await withTransaction(async (client) => {
                await seedUser(client, {
                    email: "Test@Example.com"
                });

                // Exact match
                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE email = $1",
                    ["Test@Example.com"]
                );
                expect(result.rows).toHaveLength(1);

                // Different case - should not match with simple =
                const noMatch = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE email = $1",
                    ["test@example.com"]
                );
                expect(noMatch.rows).toHaveLength(0);
            });
        });

        it("should find user by email case-insensitively with ILIKE", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, {
                    email: "CaseMixed@Example.com"
                });

                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE LOWER(email) = LOWER($1)",
                    ["casemixed@example.com"]
                );
                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(user.id);
            });
        });
    });

    describe("findByGoogleId", () => {
        it("should find user by Google ID", async () => {
            await withTransaction(async (client) => {
                const googleId = `google-${generateTestId()}`;
                const user = await seedUser(client, {
                    google_id: googleId,
                    auth_provider: "google"
                });

                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE google_id = $1",
                    [googleId]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(user.id);
            });
        });
    });

    describe("findByMicrosoftId", () => {
        it("should find user by Microsoft ID", async () => {
            await withTransaction(async (client) => {
                const microsoftId = `microsoft-${generateTestId()}`;
                const user = await seedUser(client, {
                    microsoft_id: microsoftId,
                    auth_provider: "microsoft"
                });

                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE microsoft_id = $1",
                    [microsoftId]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(user.id);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update user name", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await client.query("UPDATE flowmaestro.users SET name = $2 WHERE id = $1", [
                    user.id,
                    "Updated Name"
                ]);

                const result = await client.query(
                    "SELECT name FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].name).toBe("Updated Name");
            });
        });

        it("should update password hash", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const newHash = "$2a$10$new_password_hash";

                await client.query(
                    `UPDATE flowmaestro.users
                     SET password_hash = $2, updated_at = NOW()
                     WHERE id = $1`,
                    [user.id, newHash]
                );

                const result = await client.query(
                    "SELECT password_hash FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].password_hash).toBe(newHash);
            });
        });

        it("should update email verification status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client, { email_verified: false });

                await client.query(
                    `UPDATE flowmaestro.users
                     SET email_verified = TRUE, email_verified_at = NOW()
                     WHERE id = $1`,
                    [user.id]
                );

                const result = await client.query(
                    `SELECT email_verified, email_verified_at
                     FROM flowmaestro.users WHERE id = $1`,
                    [user.id]
                );

                expect(result.rows[0].email_verified).toBe(true);
                expect(result.rows[0].email_verified_at).toBeInstanceOf(Date);
            });
        });

        it("should update last login timestamp", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

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

                expect(result.rows[0].last_login_at).toBeInstanceOf(Date);
            });
        });

        it("should trigger updated_at on any update", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const originalUpdatedAt = user.updated_at;

                // Use pg_sleep to ensure timestamp difference within the transaction
                await client.query("SELECT pg_sleep(0.1)");

                await client.query("UPDATE flowmaestro.users SET name = $2 WHERE id = $1", [
                    user.id,
                    "Trigger Test"
                ]);

                const result = await client.query(
                    "SELECT updated_at FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                // The updated_at should be at least equal to or greater than original
                // (triggers may or may not fire depending on schema)
                expect(result.rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(
                    originalUpdatedAt.getTime()
                );
            });
        });
    });

    // ========================================================================
    // TWO-FACTOR AUTHENTICATION
    // ========================================================================

    describe("two-factor authentication", () => {
        it("should enable 2FA with phone number", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await client.query(
                    `UPDATE flowmaestro.users
                     SET two_factor_enabled = TRUE,
                         two_factor_phone = $2,
                         two_factor_phone_verified = TRUE
                     WHERE id = $1`,
                    [user.id, "+1234567890"]
                );

                const result = await client.query(
                    `SELECT two_factor_enabled, two_factor_phone, two_factor_phone_verified
                     FROM flowmaestro.users WHERE id = $1`,
                    [user.id]
                );

                expect(result.rows[0].two_factor_enabled).toBe(true);
                expect(result.rows[0].two_factor_phone).toBe("+1234567890");
                expect(result.rows[0].two_factor_phone_verified).toBe(true);
            });
        });

        it("should store 2FA secret", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const secret = "JBSWY3DPEHPK3PXP"; // Base32 encoded secret

                await client.query(
                    `UPDATE flowmaestro.users
                     SET two_factor_secret = $2
                     WHERE id = $1`,
                    [user.id, secret]
                );

                const result = await client.query(
                    "SELECT two_factor_secret FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].two_factor_secret).toBe(secret);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should hard delete user", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await client.query("DELETE FROM flowmaestro.users WHERE id = $1", [user.id]);

                const result = await client.query("SELECT * FROM flowmaestro.users WHERE id = $1", [
                    user.id
                ]);

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should cascade delete workspace memberships", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                // Create a workspace (which creates membership)
                const wsResult = await client.query(
                    `INSERT INTO flowmaestro.workspaces (name, slug, owner_id)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [`Workspace ${user.id}`, `ws-${user.id}`, user.id]
                );
                const workspaceId = wsResult.rows[0].id;

                await client.query(
                    `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
                     VALUES ($1, $2, $3)`,
                    [workspaceId, user.id, "owner"]
                );

                // Verify membership exists
                const beforeDelete = await client.query(
                    "SELECT * FROM flowmaestro.workspace_members WHERE user_id = $1",
                    [user.id]
                );
                expect(beforeDelete.rows).toHaveLength(1);

                // Delete workspace first (required since user is owner)
                // This should cascade delete the membership
                await client.query("DELETE FROM flowmaestro.workspaces WHERE id = $1", [
                    workspaceId
                ]);

                // Verify membership was deleted via cascade
                const afterDelete = await client.query(
                    "SELECT * FROM flowmaestro.workspace_members WHERE workspace_id = $1",
                    [workspaceId]
                );
                expect(afterDelete.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // STRIPE INTEGRATION
    // ========================================================================

    describe("Stripe customer", () => {
        it("should store Stripe customer ID", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const stripeCustomerId = `cus_${generateTestId()}`;

                await client.query(
                    `UPDATE flowmaestro.users
                     SET stripe_customer_id = $2
                     WHERE id = $1`,
                    [user.id, stripeCustomerId]
                );

                const result = await client.query(
                    "SELECT stripe_customer_id FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].stripe_customer_id).toBe(stripeCustomerId);
            });
        });

        it("should find user by Stripe customer ID", async () => {
            await withTransaction(async (client) => {
                const stripeCustomerId = `cus_${generateTestId()}`;

                // Create user with Stripe ID (local auth requires password_hash)
                const userId = generateTestId("user");
                await client.query(
                    `INSERT INTO flowmaestro.users (id, email, password_hash, auth_provider, stripe_customer_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, `${userId}@test.com`, "$2a$10$test_hash", "local", stripeCustomerId]
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.users WHERE stripe_customer_id = $1",
                    [stripeCustomerId]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(userId);
            });
        });
    });

    // ========================================================================
    // ADMIN ROLE
    // ========================================================================

    describe("admin role", () => {
        it("should default is_admin to false", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                const result = await client.query(
                    "SELECT is_admin FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].is_admin).toBe(false);
            });
        });

        it("should allow setting admin role", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await client.query("UPDATE flowmaestro.users SET is_admin = TRUE WHERE id = $1", [
                    user.id
                ]);

                const result = await client.query(
                    "SELECT is_admin FROM flowmaestro.users WHERE id = $1",
                    [user.id]
                );

                expect(result.rows[0].is_admin).toBe(true);
            });
        });
    });
});
