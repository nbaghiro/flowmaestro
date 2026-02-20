/**
 * WorkspaceMemberRepository E2E Tests
 *
 * Tests workspace member database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkspaceMember,
    seedWorkspaceWithMembers
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("WorkspaceMemberRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should add a member to workspace", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const member = await seedUser(client, { name: "New Member" });
                const workspace = await seedWorkspace(client, owner.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
                     VALUES ($1, $2, $3)
                     RETURNING *`,
                    [workspace.id, member.id, "member"]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].workspace_id).toBe(workspace.id);
                expect(result.rows[0].user_id).toBe(member.id);
                expect(result.rows[0].role).toBe("member");
            });
        });

        it("should assign correct role", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const admin = await seedUser(client, { name: "Admin" });
                const workspace = await seedWorkspace(client, owner.id);

                const membership = await seedWorkspaceMember(
                    client,
                    workspace.id,
                    admin.id,
                    "admin"
                );

                expect(membership.role).toBe("admin");
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return membership when it exists", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                const membership = await seedWorkspaceMember(
                    client,
                    workspace.id,
                    member.id,
                    "member"
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.workspace_members WHERE id = $1",
                    [membership.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(membership.id);
            });
        });
    });

    describe("findByWorkspaceAndUser", () => {
        it("should return membership for specific user in workspace", async () => {
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

        it("should return null for non-member", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const nonMember = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, nonMember.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all members of workspace", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const { workspace, members: _members } = await seedWorkspaceWithMembers(
                    client,
                    owner.id,
                    4
                );

                // Should have owner + 4 members = 5 total
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(5);
            });
        });
    });

    describe("findByWorkspaceIdWithUsers", () => {
        it("should return members with user details", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner User" });
                const member = await seedUser(client, { name: "Member User" });
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                const result = await client.query(
                    `SELECT wm.*, u.name as user_name, u.email as user_email
                     FROM flowmaestro.workspace_members wm
                     JOIN flowmaestro.users u ON wm.user_id = u.id
                     WHERE wm.workspace_id = $1`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(2);
                const names = result.rows.map((r) => r.user_name);
                expect(names).toContain("Owner User");
                expect(names).toContain("Member User");
            });
        });
    });

    describe("findByUserId", () => {
        it("should return all memberships for a user", async () => {
            await withTransaction(async (client) => {
                const owner1 = await seedUser(client, { name: "Owner 1" });
                const owner2 = await seedUser(client, { name: "Owner 2" });
                const member = await seedUser(client, { name: "Member" });

                const ws1 = await seedWorkspace(client, owner1.id, { name: "Workspace 1" });
                const ws2 = await seedWorkspace(client, owner2.id, { name: "Workspace 2" });

                await seedWorkspaceMember(client, ws1.id, member.id, "member");
                await seedWorkspaceMember(client, ws2.id, member.id, "admin");

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE user_id = $1`,
                    [member.id]
                );

                expect(result.rows).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("updateRole", () => {
        it("should update member role", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

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

        it("should update member to viewer", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                await client.query(
                    `UPDATE flowmaestro.workspace_members
                     SET role = $3
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id, "viewer"]
                );

                const result = await client.query(
                    `SELECT role FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND user_id = $2`,
                    [workspace.id, member.id]
                );

                expect(result.rows[0].role).toBe("viewer");
            });
        });
    });

    // ========================================================================
    // MEMBER COUNT
    // ========================================================================

    describe("getMemberCount", () => {
        it("should return correct member count", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const { workspace } = await seedWorkspaceWithMembers(client, owner.id, 5);

                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1`,
                    [workspace.id]
                );

                // Owner + 5 members = 6
                expect(parseInt(result.rows[0].count)).toBe(6);
            });
        });
    });

    // ========================================================================
    // GET OWNER
    // ========================================================================

    describe("getOwner", () => {
        it("should return workspace owner", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client, { name: "Owner" });
                const workspace = await seedWorkspace(client, owner.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workspace_members
                     WHERE workspace_id = $1 AND role = 'owner'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].user_id).toBe(owner.id);
            });
        });
    });

    // ========================================================================
    // MEMBERSHIP CHECK
    // ========================================================================

    describe("isUserMember", () => {
        it("should return true for member", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                const result = await client.query(
                    `SELECT EXISTS(
                        SELECT 1 FROM flowmaestro.workspace_members
                        WHERE workspace_id = $1 AND user_id = $2
                    ) as is_member`,
                    [workspace.id, member.id]
                );

                expect(result.rows[0].is_member).toBe(true);
            });
        });

        it("should return false for non-member", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const nonMember = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);

                const result = await client.query(
                    `SELECT EXISTS(
                        SELECT 1 FROM flowmaestro.workspace_members
                        WHERE workspace_id = $1 AND user_id = $2
                    ) as is_member`,
                    [workspace.id, nonMember.id]
                );

                expect(result.rows[0].is_member).toBe(false);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should delete membership by id", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                const membership = await seedWorkspaceMember(
                    client,
                    workspace.id,
                    member.id,
                    "member"
                );

                await client.query("DELETE FROM flowmaestro.workspace_members WHERE id = $1", [
                    membership.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.workspace_members WHERE id = $1",
                    [membership.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should delete membership by workspace and user", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

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
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce unique workspace member constraint", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);

                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                // Try to add same member again
                await expect(
                    seedWorkspaceMember(client, workspace.id, member.id, "admin")
                ).rejects.toThrow(/duplicate key value violates unique constraint/);
            });
        });

        it("should enforce valid role values", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
                         VALUES ($1, $2, $3)`,
                        [workspace.id, member.id, "invalid_role"]
                    )
                ).rejects.toThrow(/violates check constraint/);
            });
        });

        it("should enforce workspace_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const nonExistentWorkspaceId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
                         VALUES ($1, $2, $3)`,
                        [nonExistentWorkspaceId, user.id, "member"]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should enforce user_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
                         VALUES ($1, $2, $3)`,
                        [workspace.id, nonExistentUserId, "member"]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should cascade delete when workspace is deleted", async () => {
            await withTransaction(async (client) => {
                const owner = await seedUser(client);
                const member = await seedUser(client);
                const workspace = await seedWorkspace(client, owner.id);
                await seedWorkspaceMember(client, workspace.id, member.id, "member");

                // Delete workspace (cascades to members)
                await client.query("DELETE FROM flowmaestro.workspaces WHERE id = $1", [
                    workspace.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.workspace_members WHERE workspace_id = $1",
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });
});
