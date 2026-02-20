/**
 * Workspace API E2E Tests
 *
 * Tests workspace management against a real PostgreSQL database
 * using Testcontainers. Covers workspace CRUD, member management,
 * and resource limits.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkspaceMember,
    seedWorkflow,
    seedAgent
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Workspace API (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE WORKSPACE
    // ========================================================================

    describe("create workspace", () => {
        it("should create workspace with owner", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspaceName = "New Workspace";
                const slug = "new-workspace-" + Date.now();

                // Create workspace with owner_id (required field)
                const wsResult = await client.query(
                    `INSERT INTO flowmaestro.workspaces
                     (name, type, slug, owner_id)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, name, type`,
                    [workspaceName, "team", slug, user.id]
                );

                const workspaceId = wsResult.rows[0].id;

                // Add owner membership
                await client.query(
                    `INSERT INTO flowmaestro.workspace_members
                     (workspace_id, user_id, role)
                     VALUES ($1, $2, $3)`,
                    [workspaceId, user.id, "owner"]
                );

                // Verify workspace and membership
                const result = await client.query(
                    `SELECT ws.*, wm.role
                     FROM flowmaestro.workspaces ws
                     JOIN flowmaestro.workspace_members wm ON ws.id = wm.workspace_id
                     WHERE ws.id = $1 AND wm.user_id = $2`,
                    [workspaceId, user.id]
                );

                expect(result.rows[0].name).toBe(workspaceName);
                expect(result.rows[0].role).toBe("owner");
            });
        });

        it("should set default resource limits", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `SELECT max_workflows, max_agents, max_knowledge_bases, max_members
                     FROM flowmaestro.workspaces WHERE id = $1`,
                    [workspace.id]
                );

                expect(result.rows[0].max_workflows).toBeGreaterThan(0);
                expect(result.rows[0].max_agents).toBeGreaterThan(0);
            });
        });

        it("should enforce unique slug constraint", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const slug = "unique-slug-" + Date.now();

                // First workspace with this slug
                await client.query(
                    `INSERT INTO flowmaestro.workspaces (name, slug, owner_id)
                     VALUES ($1, $2, $3)`,
                    ["First Workspace", slug, user.id]
                );

                // Second workspace with same slug should fail
                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspaces (name, slug, owner_id)
                         VALUES ($1, $2, $3)`,
                        ["Second Workspace", slug, user.id]
                    )
                ).rejects.toThrow(/duplicate/i);
            });
        });
    });

    // ========================================================================
    // UPDATE WORKSPACE
    // ========================================================================

    describe("update workspace", () => {
        it("should update workspace settings", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id, {
                    name: "Original Name"
                });

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET name = $2, updated_at = NOW()
                     WHERE id = $1`,
                    [workspace.id, "Updated Name"]
                );

                const result = await client.query(
                    "SELECT name FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].name).toBe("Updated Name");
            });
        });

        it("should update workspace description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET description = $2
                     WHERE id = $1`,
                    [workspace.id, "New description for the workspace"]
                );

                const result = await client.query(
                    "SELECT description FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].description).toBe("New description for the workspace");
            });
        });
    });

    // ========================================================================
    // DELETE WORKSPACE
    // ========================================================================

    describe("delete workspace", () => {
        it("should soft delete workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [workspace.id]
                );

                // Should not appear in normal queries
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should preserve workspace in queries including deleted", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Soft delete workspace
                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [workspace.id]
                );

                // Should still appear without deleted_at filter
                const result = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].deleted_at).not.toBeNull();
            });
        });
    });

    // ========================================================================
    // RESOURCE COUNTS
    // ========================================================================

    describe("resource counts", () => {
        it("should get aggregated resource statistics", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create resources
                for (let i = 0; i < 5; i++) {
                    await seedWorkflow(client, workspace.id, user.id);
                }
                for (let i = 0; i < 3; i++) {
                    await seedAgent(client, workspace.id, user.id);
                }

                // Get counts
                const result = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.workflows WHERE workspace_id = $1 AND deleted_at IS NULL) as workflow_count,
                        (SELECT COUNT(*) FROM flowmaestro.agents WHERE workspace_id = $1 AND deleted_at IS NULL) as agent_count,
                        (SELECT COUNT(*) FROM flowmaestro.workspace_members WHERE workspace_id = $1) as member_count`,
                    [workspace.id]
                );

                expect(parseInt(result.rows[0].workflow_count)).toBe(5);
                expect(parseInt(result.rows[0].agent_count)).toBe(3);
                expect(parseInt(result.rows[0].member_count)).toBeGreaterThanOrEqual(1);
            });
        });

        it("should check resource limits before creation", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Get limit
                const limitResult = await client.query(
                    "SELECT max_workflows FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );
                const maxWorkflows = limitResult.rows[0].max_workflows;

                // Get current count
                const countResult = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );
                const currentCount = parseInt(countResult.rows[0].count);

                // Check if within limit
                const canCreate = currentCount < maxWorkflows;
                expect(canCreate).toBe(true);
            });
        });
    });

    // ========================================================================
    // MEMBER MANAGEMENT
    // ========================================================================

    describe("member management", () => {
        it("should add member to workspace", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });
                const workspace = await seedWorkspace(client, owner.id);

                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].role).toBe("member");
            });
        });

        it("should update member role", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });
                const workspace = await seedWorkspace(client, owner.id);

                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                // Promote to admin
                await client.query(
                    `UPDATE flowmaestro.workspace_members
                     SET role = $3
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id, "admin"]
                );

                const result = await client.query(
                    `SELECT role FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id]
                );

                expect(result.rows[0].role).toBe("admin");
            });
        });

        it("should remove member from workspace", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });
                const workspace = await seedWorkspace(client, owner.id);

                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                // Remove member
                await client.query(
                    `DELETE FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should count workspace members", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);

                // Add additional members
                for (let i = 0; i < 3; i++) {
                    const user = await seedUser(client, { name: `Member ${i}` });
                    await seedWorkspaceMember(client, workspace.id, user.id, "member");
                }

                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1`,
                    [workspace.id]
                );

                // 1 owner + 3 members = 4
                expect(parseInt(result.rows[0].count)).toBe(4);
            });
        });
    });

    // ========================================================================
    // WORKSPACE SETTINGS
    // ========================================================================

    describe("workspace settings", () => {
        it("should store settings as JSONB", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const settings = {
                    theme: "dark",
                    notifications: { email: true, slack: false },
                    defaults: { model: "gpt-4" }
                };

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET settings = $2
                     WHERE id = $1`,
                    [workspace.id, JSON.stringify(settings)]
                );

                const result = await client.query(
                    "SELECT settings FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].settings.theme).toBe("dark");
                expect(result.rows[0].settings.notifications.email).toBe(true);
            });
        });

        it("should merge settings updates", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Set initial settings
                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET settings = $2
                     WHERE id = $1`,
                    [workspace.id, JSON.stringify({ theme: "light", feature1: true })]
                );

                // Merge new settings
                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET settings = settings || $2::jsonb
                     WHERE id = $1`,
                    [workspace.id, JSON.stringify({ theme: "dark", feature2: true })]
                );

                const result = await client.query(
                    "SELECT settings FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].settings.theme).toBe("dark"); // Updated
                expect(result.rows[0].settings.feature1).toBe(true); // Preserved
                expect(result.rows[0].settings.feature2).toBe(true); // Added
            });
        });
    });

    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should list only user's workspaces", async () => {
            await withTransaction(async (client) => {
                const user1 = await seedUser(client, { name: "User 1" });
                const user2 = await seedUser(client, { name: "User 2" });

                await seedWorkspace(client, user1.id, { name: "User1 WS" });
                await seedWorkspace(client, user2.id, { name: "User2 WS" });

                // User1's workspaces
                const result = await client.query(
                    `SELECT ws.name FROM flowmaestro.workspaces ws
                     JOIN flowmaestro.workspace_members wm ON ws.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND ws.deleted_at IS NULL`,
                    [user1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("User1 WS");
            });
        });

        it("should include shared workspaces in member list", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });

                const ownedWs = await seedWorkspace(client, owner.id, { name: "Owned WS" });
                const sharedWs = await seedWorkspace(client, owner.id, { name: "Shared WS" });

                // Add member to shared workspace
                await seedWorkspaceMember(client, sharedWs.id, member.id, "member");

                // Member should see shared workspace
                const result = await client.query(
                    `SELECT ws.name FROM flowmaestro.workspaces ws
                     JOIN flowmaestro.workspace_members wm ON ws.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND ws.deleted_at IS NULL`,
                    [member.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Shared WS");

                // Verify member cannot see owned workspace
                expect(result.rows.map((r) => r.name)).not.toContain("Owned WS");

                // Suppress unused variable warning
                expect(ownedWs.id).toBeDefined();
            });
        });
    });
});
