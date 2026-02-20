/**
 * ConnectionRepository E2E Tests
 *
 * Tests connection database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedConnection,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("ConnectionRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create an OAuth connection with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connId = generateTestId("conn");

                const metadata = {
                    scopes: ["read", "write"],
                    connected_at: new Date().toISOString()
                };
                const capabilities = { refresh: true, revoke: true };

                const result = await client.query(
                    `INSERT INTO flowmaestro.connections (
                        id, user_id, workspace_id, name, connection_method, provider,
                        encrypted_data, metadata, status, capabilities
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *`,
                    [
                        connId,
                        user.id,
                        workspace.id,
                        "Google Connection",
                        "oauth2",
                        "google",
                        "encrypted_oauth_tokens",
                        JSON.stringify(metadata),
                        "active",
                        JSON.stringify(capabilities)
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const conn = result.rows[0];
                expect(conn.id).toBe(connId);
                expect(conn.name).toBe("Google Connection");
                expect(conn.connection_method).toBe("oauth2");
                expect(conn.provider).toBe("google");
                expect(conn.status).toBe("active");
                expect(conn.metadata).toEqual(metadata);
                expect(conn.capabilities).toEqual(capabilities);
            });
        });

        it("should create an API key connection", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const connection = await seedConnection(client, workspace.id, user.id, "openai", {
                    name: "OpenAI API Key",
                    connection_method: "api_key",
                    encrypted_data: "encrypted_api_key_data",
                    capabilities: { refresh: false }
                });

                const result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows[0].connection_method).toBe("api_key");
                expect(result.rows[0].provider).toBe("openai");
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return connection when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google");

                const result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(connection.id);
            });
        });

        it("should return empty for non-existent connection", async () => {
            await withTransaction(async (client) => {
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE id = $1",
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all connections in workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedConnection(client, workspace.id, user.id, "google");
                await seedConnection(client, workspace.id, user.id, "microsoft");
                await seedConnection(client, workspace.id, user.id, "openai");

                const result = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1
                     ORDER BY created_at DESC`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });

        it("should paginate results correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const providers = ["google", "microsoft", "openai", "slack", "notion"];
                for (const provider of providers) {
                    await seedConnection(client, workspace.id, user.id, provider);
                }

                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 2, 0]
                );

                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 2, 2]
                );

                expect(page1.rows).toHaveLength(2);
                expect(page2.rows).toHaveLength(2);
            });
        });

        it("should filter by provider", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedConnection(client, workspace.id, user.id, "google");
                await seedConnection(client, workspace.id, user.id, "google");
                await seedConnection(client, workspace.id, user.id, "microsoft");

                const result = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1 AND provider = $2`,
                    [workspace.id, "google"]
                );

                expect(result.rows).toHaveLength(2);
            });
        });

        it("should filter by connection_method", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedConnection(client, workspace.id, user.id, "google", {
                    connection_method: "oauth2"
                });
                await seedConnection(client, workspace.id, user.id, "openai", {
                    connection_method: "api_key"
                });
                await seedConnection(client, workspace.id, user.id, "anthropic", {
                    connection_method: "api_key"
                });

                const apiKeyConns = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1 AND connection_method = $2`,
                    [workspace.id, "api_key"]
                );

                expect(apiKeyConns.rows).toHaveLength(2);
            });
        });

        it("should filter by status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedConnection(client, workspace.id, user.id, "google", { status: "active" });
                await seedConnection(client, workspace.id, user.id, "microsoft", {
                    status: "active"
                });
                await seedConnection(client, workspace.id, user.id, "slack", { status: "expired" });

                const activeConns = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1 AND status = $2`,
                    [workspace.id, "active"]
                );

                expect(activeConns.rows).toHaveLength(2);
            });
        });
    });

    describe("findByProviderInWorkspace", () => {
        it("should return all connections for a specific provider", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedConnection(client, workspace.id, user.id, "google", {
                    name: "Personal Google"
                });
                await seedConnection(client, workspace.id, user.id, "google", {
                    name: "Work Google"
                });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1 AND provider = $2`,
                    [workspace.id, "google"]
                );

                expect(result.rows).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update connection name", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google");

                await client.query("UPDATE flowmaestro.connections SET name = $2 WHERE id = $1", [
                    connection.id,
                    "Renamed Connection"
                ]);

                const result = await client.query(
                    "SELECT name FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows[0].name).toBe("Renamed Connection");
            });
        });

        it("should update tokens (refresh)", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google", {
                    encrypted_data: "old_encrypted_data"
                });

                await client.query(
                    "UPDATE flowmaestro.connections SET encrypted_data = $2 WHERE id = $1",
                    [connection.id, "new_refreshed_encrypted_data"]
                );

                const result = await client.query(
                    "SELECT encrypted_data FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows[0].encrypted_data).toBe("new_refreshed_encrypted_data");
            });
        });

        it("should update status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google", {
                    status: "active"
                });

                await client.query("UPDATE flowmaestro.connections SET status = $2 WHERE id = $1", [
                    connection.id,
                    "expired"
                ]);

                const result = await client.query(
                    "SELECT status FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows[0].status).toBe("expired");
            });
        });

        it("should mark as used", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google");

                expect(connection.last_used_at).toBeNull();

                await client.query(
                    "UPDATE flowmaestro.connections SET last_used_at = NOW() WHERE id = $1",
                    [connection.id]
                );

                const result = await client.query(
                    "SELECT last_used_at FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows[0].last_used_at).toBeInstanceOf(Date);
            });
        });
    });

    // ========================================================================
    // EXPIRY DETECTION
    // ========================================================================

    describe("findExpiringSoon", () => {
        it("should find connections expiring within buffer time", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Connection expiring in 5 minutes
                await seedConnection(client, workspace.id, user.id, "google", {
                    name: "Expiring Soon",
                    metadata: { expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }
                });

                // Connection expiring in 2 hours
                await seedConnection(client, workspace.id, user.id, "microsoft", {
                    name: "Not Expiring Soon",
                    metadata: {
                        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                    }
                });

                // Query for connections with expires_at in metadata within 30 minutes
                const bufferMs = 30 * 60 * 1000; // 30 minutes
                const threshold = new Date(Date.now() + bufferMs);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.connections
                     WHERE workspace_id = $1
                     AND (metadata->>'expires_at')::timestamp < $2
                     AND status = 'active'`,
                    [workspace.id, threshold.toISOString()]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Expiring Soon");
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should delete connection permanently", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const connection = await seedConnection(client, workspace.id, user.id, "google");

                await client.query("DELETE FROM flowmaestro.connections WHERE id = $1", [
                    connection.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE id = $1",
                    [connection.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce user_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const workspace = await seedWorkspace(client, (await seedUser(client)).id);
                const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.connections (
                            user_id, workspace_id, name, connection_method, provider,
                            encrypted_data, metadata, status, capabilities
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            nonExistentUserId,
                            workspace.id,
                            "Invalid Connection",
                            "oauth2",
                            "google",
                            "data",
                            JSON.stringify({}),
                            "active",
                            JSON.stringify({})
                        ]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should require encrypted_data field", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.connections (
                            user_id, workspace_id, name, connection_method, provider,
                            metadata, status, capabilities
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            user.id,
                            workspace.id,
                            "No Data Connection",
                            "oauth2",
                            "google",
                            JSON.stringify({}),
                            "active",
                            JSON.stringify({})
                        ]
                    )
                ).rejects.toThrow(/null value in column "encrypted_data"/);
            });
        });
    });

    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should only return connections from the specified workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                await seedConnection(client, workspace1.id, user.id, "google", {
                    name: "WS1 Google"
                });
                await seedConnection(client, workspace2.id, user.id, "google", {
                    name: "WS2 Google"
                });

                const ws1Result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE workspace_id = $1",
                    [workspace1.id]
                );

                const ws2Result = await client.query(
                    "SELECT * FROM flowmaestro.connections WHERE workspace_id = $1",
                    [workspace2.id]
                );

                expect(ws1Result.rows).toHaveLength(1);
                expect(ws1Result.rows[0].name).toBe("WS1 Google");
                expect(ws2Result.rows).toHaveLength(1);
                expect(ws2Result.rows[0].name).toBe("WS2 Google");
            });
        });
    });
});
