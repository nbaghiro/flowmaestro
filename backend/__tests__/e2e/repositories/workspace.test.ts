/**
 * WorkspaceRepository E2E Tests
 *
 * Tests workspace database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedAgent,
    seedKnowledgeBase,
    seedConnection,
    seedFolder,
    seedWorkspaceMember,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("WorkspaceRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a workspace with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspaceId = generateTestId("ws");

                const result = await client.query(
                    `INSERT INTO flowmaestro.workspaces (
                        id, name, slug, description, category, type, owner_id,
                        max_workflows, max_agents
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *`,
                    [
                        workspaceId,
                        "Test Workspace",
                        "test-workspace",
                        "A test workspace for E2E testing",
                        "team",
                        "pro",
                        user.id,
                        50,
                        10
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const workspace = result.rows[0];
                expect(workspace.id).toBe(workspaceId);
                expect(workspace.name).toBe("Test Workspace");
                expect(workspace.slug).toBe("test-workspace");
                expect(workspace.category).toBe("team");
                expect(workspace.type).toBe("pro");
                expect(workspace.owner_id).toBe(user.id);
                expect(workspace.deleted_at).toBeNull();
            });
        });

        it("should auto-create owner membership via seedWorkspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const memberResult = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, user.id]
                );

                expect(memberResult.rows).toHaveLength(1);
                expect(memberResult.rows[0].role).toBe("owner");
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return workspace when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(workspace.id);
            });
        });

        it("should return empty for non-existent workspace", async () => {
            await withTransaction(async (client) => {
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should not return soft-deleted workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    "UPDATE flowmaestro.workspaces SET deleted_at = NOW() WHERE id = $1",
                    [workspace.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findBySlug", () => {
        it("should return workspace by slug", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id, {
                    slug: "unique-test-slug"
                });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE slug = $1 AND deleted_at IS NULL`,
                    ["unique-test-slug"]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(workspace.id);
            });
        });
    });

    describe("findByOwnerId", () => {
        it("should return all workspaces owned by user", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await seedWorkspace(client, user.id, { name: "Workspace 1" });
                await seedWorkspace(client, user.id, { name: "Workspace 2" });
                await seedWorkspace(client, user.id, { name: "Workspace 3" });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE owner_id = $1 AND deleted_at IS NULL`,
                    [user.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });
    });

    describe("findByMemberUserId", () => {
        it("should return all workspaces user is a member of", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "Member" });

                const workspace1 = await seedWorkspace(client, owner.id, { name: "WS 1" });
                const workspace2 = await seedWorkspace(client, owner.id, { name: "WS 2" });
                await seedWorkspace(client, owner.id, { name: "WS 3" }); // Member not added

                // Add member to first two workspaces
                await seedWorkspaceMember(client, workspace1.id, member.id, "member");
                await seedWorkspaceMember(client, workspace2.id, member.id, "viewer");

                const result = await client.query(
                    `SELECT w.* FROM flowmaestro.workspaces w
                     JOIN flowmaestro.workspace_members wm ON w.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
                    [member.id]
                );

                expect(result.rows).toHaveLength(2);
            });
        });

        it("should include shared workspaces", async () => {
            await withTransaction(async (client) => {
                const user1 = await seedUser(client, { name: "User 1" });
                const user2 = await seedUser(client, { name: "User 2" });

                // User 1 owns a workspace
                await seedWorkspace(client, user1.id, { name: "User 1 Workspace" });
                // User 2 owns a workspace
                const ws2 = await seedWorkspace(client, user2.id, { name: "User 2 Workspace" });

                // User 1 is added to User 2's workspace
                await seedWorkspaceMember(client, ws2.id, user1.id, "member");

                // User 1 should see both workspaces
                const result = await client.query(
                    `SELECT w.* FROM flowmaestro.workspaces w
                     JOIN flowmaestro.workspace_members wm ON w.id = wm.workspace_id
                     WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
                    [user1.id]
                );

                expect(result.rows).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // RESOURCE COUNTS
    // ========================================================================

    describe("getResourceCounts", () => {
        it("should return counts for all resource types", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create various resources
                await seedWorkflow(client, workspace.id, user.id);
                await seedWorkflow(client, workspace.id, user.id);
                await seedAgent(client, workspace.id, user.id);
                await seedKnowledgeBase(client, workspace.id, user.id);
                await seedConnection(client, workspace.id, user.id, "google");
                await seedFolder(client, workspace.id, user.id);

                const counts = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.workflows WHERE workspace_id = $1 AND deleted_at IS NULL) as workflows,
                        (SELECT COUNT(*) FROM flowmaestro.agents WHERE workspace_id = $1 AND deleted_at IS NULL) as agents,
                        (SELECT COUNT(*) FROM flowmaestro.knowledge_bases WHERE workspace_id = $1) as knowledge_bases,
                        (SELECT COUNT(*) FROM flowmaestro.connections WHERE workspace_id = $1) as connections,
                        (SELECT COUNT(*) FROM flowmaestro.folders WHERE workspace_id = $1 AND deleted_at IS NULL) as folders`,
                    [workspace.id]
                );

                expect(parseInt(counts.rows[0].workflows)).toBe(2);
                expect(parseInt(counts.rows[0].agents)).toBe(1);
                expect(parseInt(counts.rows[0].knowledge_bases)).toBe(1);
                expect(parseInt(counts.rows[0].connections)).toBe(1);
                expect(parseInt(counts.rows[0].folders)).toBe(1);
            });
        });
    });

    // ========================================================================
    // SLUG AVAILABILITY
    // ========================================================================

    describe("isSlugAvailable", () => {
        it("should return true for available slug", async () => {
            await withTransaction(async (client) => {
                const result = await client.query(
                    `SELECT NOT EXISTS(
                        SELECT 1 FROM flowmaestro.workspaces
                        WHERE slug = $1 AND deleted_at IS NULL
                    ) as is_available`,
                    ["available-slug"]
                );

                expect(result.rows[0].is_available).toBe(true);
            });
        });

        it("should return false for taken slug", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                await seedWorkspace(client, user.id, { slug: "taken-slug" });

                const result = await client.query(
                    `SELECT NOT EXISTS(
                        SELECT 1 FROM flowmaestro.workspaces
                        WHERE slug = $1 AND deleted_at IS NULL
                    ) as is_available`,
                    ["taken-slug"]
                );

                expect(result.rows[0].is_available).toBe(false);
            });
        });

        it("should exclude specific workspace when checking", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id, {
                    slug: "existing-slug"
                });

                // When updating own slug, should be available
                const result = await client.query(
                    `SELECT NOT EXISTS(
                        SELECT 1 FROM flowmaestro.workspaces
                        WHERE slug = $1 AND deleted_at IS NULL AND id != $2
                    ) as is_available`,
                    ["existing-slug", workspace.id]
                );

                expect(result.rows[0].is_available).toBe(true);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update workspace name and description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET name = $2, description = $3
                     WHERE id = $1`,
                    [workspace.id, "Updated Workspace", "Updated description"]
                );

                const result = await client.query(
                    "SELECT name, description FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].name).toBe("Updated Workspace");
                expect(result.rows[0].description).toBe("Updated description");
            });
        });

        it("should update billing fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    `UPDATE flowmaestro.workspaces
                     SET stripe_subscription_id = $2, billing_email = $3
                     WHERE id = $1`,
                    [workspace.id, "sub_test123", "billing@example.com"]
                );

                const result = await client.query(
                    "SELECT stripe_subscription_id, billing_email FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].stripe_subscription_id).toBe("sub_test123");
                expect(result.rows[0].billing_email).toBe("billing@example.com");
            });
        });
    });

    // ========================================================================
    // SUBSCRIPTION MANAGEMENT
    // ========================================================================

    describe("findByStripeSubscriptionId", () => {
        it("should find workspace by subscription ID", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    "UPDATE flowmaestro.workspaces SET stripe_subscription_id = $2 WHERE id = $1",
                    [workspace.id, "sub_unique123"]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspaces
                     WHERE stripe_subscription_id = $1 AND deleted_at IS NULL`,
                    ["sub_unique123"]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(workspace.id);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should soft delete workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await client.query(
                    "UPDATE flowmaestro.workspaces SET deleted_at = NOW() WHERE id = $1",
                    [workspace.id]
                );

                const result = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workspaces WHERE id = $1",
                    [workspace.id]
                );

                expect(result.rows[0].deleted_at).toBeInstanceOf(Date);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce unique slug constraint", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                await seedWorkspace(client, user.id, { slug: "unique-slug" });

                await expect(
                    seedWorkspace(client, user.id, { slug: "unique-slug" })
                ).rejects.toThrow(/duplicate key value violates unique constraint/);
            });
        });

        it("should enforce owner_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspaces (name, slug, owner_id)
                         VALUES ($1, $2, $3)`,
                        ["Invalid Workspace", "invalid-ws", nonExistentUserId]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should enforce valid category values", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspaces (name, slug, owner_id, category)
                         VALUES ($1, $2, $3, $4)`,
                        ["Invalid", "invalid", user.id, "invalid_category"]
                    )
                ).rejects.toThrow(/violates check constraint/);
            });
        });

        it("should enforce valid type values", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspaces (name, slug, owner_id, type)
                         VALUES ($1, $2, $3, $4)`,
                        ["Invalid", "invalid", user.id, "invalid_type"]
                    )
                ).rejects.toThrow(/violates check constraint/);
            });
        });
    });
});
