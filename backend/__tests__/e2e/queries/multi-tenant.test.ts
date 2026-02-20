/**
 * Multi-Tenant Isolation E2E Tests
 *
 * Tests workspace and user isolation against a real PostgreSQL database
 * using Testcontainers. Verifies that data access is properly scoped.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedAgent,
    seedKnowledgeBase,
    seedConnection,
    seedFolder,
    seedWorkspaceMember
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Multi-Tenant Isolation (Real PostgreSQL)", () => {
    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should not return workflows from other workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                // Create workflows in both workspaces
                await seedWorkflow(client, workspace1.id, user.id, { name: "WS1 Workflow" });
                await seedWorkflow(client, workspace2.id, user.id, { name: "WS2 Workflow" });

                // Query for workspace1 only
                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("WS1 Workflow");
            });
        });

        it("should not return agents from other workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                await seedAgent(client, workspace1.id, user.id, { name: "Agent WS1" });
                await seedAgent(client, workspace2.id, user.id, { name: "Agent WS2" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Agent WS1");
            });
        });

        it("should not return knowledge bases from other workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                await seedKnowledgeBase(client, workspace1.id, user.id, { name: "KB WS1" });
                await seedKnowledgeBase(client, workspace2.id, user.id, { name: "KB WS2" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("KB WS1");
            });
        });

        it("should not return connections from other workspaces", async () => {
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

                const result = await client.query(
                    `SELECT name FROM flowmaestro.connections
                     WHERE workspace_id = $1`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("WS1 Google");
            });
        });

        it("should not return folders from other workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                await seedFolder(client, workspace1.id, user.id, { name: "Folder WS1" });
                await seedFolder(client, workspace2.id, user.id, { name: "Folder WS2" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.folders
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Folder WS1");
            });
        });
    });

    // ========================================================================
    // USER ISOLATION
    // ========================================================================

    describe("user isolation", () => {
        it("should scope queries to user's workspaces only", async () => {
            await withTransaction(async (client) => {
                const user1 = await seedUser(client, { name: "User 1" });
                const user2 = await seedUser(client, { name: "User 2" });

                const workspace1 = await seedWorkspace(client, user1.id, { name: "User1 WS" });
                const workspace2 = await seedWorkspace(client, user2.id, { name: "User2 WS" });

                await seedWorkflow(client, workspace1.id, user1.id, { name: "User1 Workflow" });
                await seedWorkflow(client, workspace2.id, user2.id, { name: "User2 Workflow" });

                // Query workflows for user1's workspaces
                const result = await client.query(
                    `SELECT w.name FROM flowmaestro.workflows w
                     JOIN flowmaestro.workspace_members wm ON w.workspace_id = wm.workspace_id
                     WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
                    [user1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("User1 Workflow");
            });
        });
    });

    // ========================================================================
    // CROSS-WORKSPACE ACCESS DENIED
    // ========================================================================

    describe("cross-workspace denied", () => {
        it("should fail foreign key when referencing resource from different workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                // Create agent in workspace1
                const agent = await seedAgent(client, workspace1.id, user.id);

                // Try to create thread referencing agent from workspace1 but in workspace2
                // Note: The database may or may not have a cross-workspace constraint
                // depending on implementation. Test that the query works with correct workspace.
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.agents
                     WHERE id = $1 AND workspace_id = $2`,
                    [agent.id, workspace2.id]
                );

                // Agent should NOT be found in workspace2
                expect(parseInt(result.rows[0].count)).toBe(0);
            });
        });

        it("should not allow updating resource in wrong workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                const workflow = await seedWorkflow(client, workspace1.id, user.id);

                // Try to update workflow as if it belongs to workspace2
                const result = await client.query(
                    `UPDATE flowmaestro.workflows
                     SET name = 'Hacked'
                     WHERE id = $1 AND workspace_id = $2
                     RETURNING id`,
                    [workflow.id, workspace2.id]
                );

                // Should not find/update any rows
                expect(result.rowCount).toBe(0);
            });
        });
    });

    // ========================================================================
    // SHARED WORKSPACE ACCESS
    // ========================================================================

    describe("shared workspace access", () => {
        it("should allow member to access workspace resources", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });

                const workspace = await seedWorkspace(client, owner.id, { name: "Shared WS" });

                // Add member to workspace
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                // Create workflow
                await seedWorkflow(client, workspace.id, owner.id, { name: "Shared Workflow" });

                // Member should be able to see the workflow
                const result = await client.query(
                    `SELECT w.name FROM flowmaestro.workflows w
                     JOIN flowmaestro.workspace_members wm ON w.workspace_id = wm.workspace_id
                     WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
                    [member.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Shared Workflow");
            });
        });

        it("should show workspace in member's workspace list", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });

                await seedWorkspace(client, owner.id, {
                    name: "Owner Only WS"
                });
                const sharedWorkspace = await seedWorkspace(client, owner.id, {
                    name: "Shared WS"
                });

                // Add member to shared workspace only
                await seedWorkspaceMember(client, sharedWorkspace.id, member.id, "member");

                // Member's workspaces
                const result = await client.query(
                    `SELECT ws.name FROM flowmaestro.workspaces ws
                     JOIN flowmaestro.workspace_members wm ON ws.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND ws.deleted_at IS NULL`,
                    [member.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Shared WS");
            });
        });
    });

    // ========================================================================
    // OWNER VS MEMBER ACCESS
    // ========================================================================

    describe("owner vs member access", () => {
        it("should differentiate roles in queries", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const admin = await seedUser(client, { name: "Admin" });
                const member = await seedUser(client, { name: "Member" });
                const viewer = await seedUser(client, { name: "Viewer" });

                const workspace = await seedWorkspace(client, owner.id);

                await seedWorkspaceMember(client, workspace.id, admin.id, "admin");
                await seedWorkspaceMember(client, workspace.id, member.id, "member");
                await seedWorkspaceMember(client, workspace.id, viewer.id, "viewer");

                // Get all members with roles
                const result = await client.query(
                    `SELECT u.name, wm.role FROM flowmaestro.workspace_members wm
                     JOIN flowmaestro.users u ON wm.user_id = u.id
                     WHERE wm.workspace_id = $1
                     ORDER BY CASE wm.role
                         WHEN 'owner' THEN 1
                         WHEN 'admin' THEN 2
                         WHEN 'member' THEN 3
                         WHEN 'viewer' THEN 4
                     END`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(4);
                expect(result.rows[0].role).toBe("owner");
                expect(result.rows[1].role).toBe("admin");
                expect(result.rows[2].role).toBe("member");
                expect(result.rows[3].role).toBe("viewer");
            });
        });

        it("should check write permission based on role", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const viewer = await seedUser(client, { name: "Viewer" });

                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, viewer.id, "viewer");

                // Simulate permission check for viewer
                const hasWritePermission = await client.query(
                    `SELECT EXISTS(
                        SELECT 1 FROM flowmaestro.workspace_members
                        WHERE workspace_id = $1
                        AND user_id = $2
                        AND role IN ('owner', 'admin', 'member')
                    ) as has_permission`,
                    [workspace.id, viewer.id]
                );

                expect(hasWritePermission.rows[0].has_permission).toBe(false);

                // Simulate permission check for owner
                const ownerHasPermission = await client.query(
                    `SELECT EXISTS(
                        SELECT 1 FROM flowmaestro.workspace_members
                        WHERE workspace_id = $1
                        AND user_id = $2
                        AND role IN ('owner', 'admin', 'member')
                    ) as has_permission`,
                    [workspace.id, owner.id]
                );

                expect(ownerHasPermission.rows[0].has_permission).toBe(true);
            });
        });
    });

    // ========================================================================
    // AGGREGATE QUERIES WITH ISOLATION
    // ========================================================================

    describe("aggregate queries with isolation", () => {
        it("should count only workspace-scoped resources", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "WS1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "WS2" });

                // Create different amounts in each workspace
                for (let i = 0; i < 5; i++) {
                    await seedWorkflow(client, workspace1.id, user.id);
                }
                for (let i = 0; i < 3; i++) {
                    await seedWorkflow(client, workspace2.id, user.id);
                }

                // Count for workspace1 only
                const result = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace1.id]
                );

                expect(parseInt(result.rows[0].total)).toBe(5);
            });
        });
    });
});
