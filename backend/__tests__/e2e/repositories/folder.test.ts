/**
 * FolderRepository E2E Tests
 *
 * Tests folder database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedFolder,
    seedWorkflow,
    seedAgent,
    seedFolderHierarchy,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("FolderRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a root folder with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folderId = generateTestId("folder");

                const result = await client.query(
                    `INSERT INTO flowmaestro.folders (
                        id, user_id, workspace_id, name, color, position
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [folderId, user.id, workspace.id, "Test Folder", "#ff5733", 0]
                );

                expect(result.rows).toHaveLength(1);
                const folder = result.rows[0];
                expect(folder.id).toBe(folderId);
                expect(folder.name).toBe("Test Folder");
                expect(folder.color).toBe("#ff5733");
                expect(folder.position).toBe(0);
                expect(folder.parent_id).toBeNull();
                expect(folder.depth).toBe(0);
                expect(folder.path).toBe(`/${folderId}`);
            });
        });

        it("should create a nested folder with correct path and depth", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parentFolder = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent"
                });
                const childFolder = await seedFolder(client, workspace.id, user.id, {
                    name: "Child",
                    parent_id: parentFolder.id
                });

                const result = await client.query(
                    "SELECT depth, path, parent_id FROM flowmaestro.folders WHERE id = $1",
                    [childFolder.id]
                );

                expect(result.rows[0].depth).toBe(1);
                expect(result.rows[0].path).toBe(`/${parentFolder.id}/${childFolder.id}`);
                expect(result.rows[0].parent_id).toBe(parentFolder.id);
            });
        });
    });

    // ========================================================================
    // FOLDER TREE
    // ========================================================================

    describe("getFolderTree", () => {
        it("should return all folders with hierarchy", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const folders = await seedFolderHierarchy(client, workspace.id, user.id, 3, 2);

                // 2 breadth at depth 0, 2 breadth at depth 1, 2 breadth at depth 2 = 2 + 4 + 8 = 14
                expect(folders.length).toBe(14);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.folders
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY depth, position`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(14);
            });
        });

        it("should build proper recursive tree structure", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 1"
                });
                const parent2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 2"
                });
                await seedFolder(client, workspace.id, user.id, {
                    name: "Child 1-1",
                    parent_id: parent1.id
                });
                await seedFolder(client, workspace.id, user.id, {
                    name: "Child 1-2",
                    parent_id: parent1.id
                });
                await seedFolder(client, workspace.id, user.id, {
                    name: "Child 2-1",
                    parent_id: parent2.id
                });

                // Get root folders
                const rootResult = await client.query(
                    `SELECT * FROM flowmaestro.folders
                     WHERE workspace_id = $1 AND parent_id IS NULL AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(rootResult.rows).toHaveLength(2);

                // Get children of parent1
                const childResult = await client.query(
                    `SELECT * FROM flowmaestro.folders
                     WHERE parent_id = $1 AND deleted_at IS NULL`,
                    [parent1.id]
                );

                expect(childResult.rows).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // FOLDER CONTENTS
    // ========================================================================

    describe("getContents", () => {
        it("should return workflows and agents in folder", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                // Create workflows in folder
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                await client.query(
                    "UPDATE flowmaestro.workflows SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                    [folder.id, workflow.id]
                );

                // Create agent in folder
                const agent = await seedAgent(client, workspace.id, user.id);
                await client.query(
                    "UPDATE flowmaestro.agents SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                    [folder.id, agent.id]
                );

                // Query folder contents
                const workflows = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE $1 = ANY(folder_ids) AND deleted_at IS NULL`,
                    [folder.id]
                );

                const agents = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE $1 = ANY(folder_ids) AND deleted_at IS NULL`,
                    [folder.id]
                );

                expect(workflows.rows).toHaveLength(1);
                expect(agents.rows).toHaveLength(1);
            });
        });

        it("should return item counts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                // Add items to folder
                for (let i = 0; i < 3; i++) {
                    const workflow = await seedWorkflow(client, workspace.id, user.id);
                    await client.query(
                        "UPDATE flowmaestro.workflows SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                        [folder.id, workflow.id]
                    );
                }

                for (let i = 0; i < 2; i++) {
                    const agent = await seedAgent(client, workspace.id, user.id);
                    await client.query(
                        "UPDATE flowmaestro.agents SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                        [folder.id, agent.id]
                    );
                }

                const counts = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.workflows WHERE $1 = ANY(folder_ids) AND deleted_at IS NULL) as workflow_count,
                        (SELECT COUNT(*) FROM flowmaestro.agents WHERE $1 = ANY(folder_ids) AND deleted_at IS NULL) as agent_count`,
                    [folder.id]
                );

                expect(parseInt(counts.rows[0].workflow_count)).toBe(3);
                expect(parseInt(counts.rows[0].agent_count)).toBe(2);
            });
        });
    });

    // ========================================================================
    // MOVE FOLDER
    // ========================================================================

    describe("moveFolder", () => {
        it("should move folder to new parent", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 1"
                });
                const parent2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 2"
                });
                const child = await seedFolder(client, workspace.id, user.id, {
                    name: "Child",
                    parent_id: parent1.id
                });

                // Move child from parent1 to parent2
                await client.query("UPDATE flowmaestro.folders SET parent_id = $2 WHERE id = $1", [
                    child.id,
                    parent2.id
                ]);

                const result = await client.query(
                    "SELECT parent_id, depth, path FROM flowmaestro.folders WHERE id = $1",
                    [child.id]
                );

                expect(result.rows[0].parent_id).toBe(parent2.id);
                expect(result.rows[0].depth).toBe(1);
                expect(result.rows[0].path).toBe(`/${parent2.id}/${child.id}`);
            });
        });

        it("should move folder to root", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent = await seedFolder(client, workspace.id, user.id, { name: "Parent" });
                const child = await seedFolder(client, workspace.id, user.id, {
                    name: "Child",
                    parent_id: parent.id
                });

                // Move child to root
                await client.query(
                    "UPDATE flowmaestro.folders SET parent_id = NULL WHERE id = $1",
                    [child.id]
                );

                const result = await client.query(
                    "SELECT parent_id, depth, path FROM flowmaestro.folders WHERE id = $1",
                    [child.id]
                );

                expect(result.rows[0].parent_id).toBeNull();
                expect(result.rows[0].depth).toBe(0);
                expect(result.rows[0].path).toBe(`/${child.id}`);
            });
        });

        it("should prevent circular reference", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent = await seedFolder(client, workspace.id, user.id, { name: "Parent" });
                const child = await seedFolder(client, workspace.id, user.id, {
                    name: "Child",
                    parent_id: parent.id
                });
                const grandchild = await seedFolder(client, workspace.id, user.id, {
                    name: "Grandchild",
                    parent_id: child.id
                });

                // Try to move parent into grandchild (circular)
                await expect(
                    client.query("UPDATE flowmaestro.folders SET parent_id = $2 WHERE id = $1", [
                        parent.id,
                        grandchild.id
                    ])
                ).rejects.toThrow(/circular reference/);
            });
        });
    });

    // ========================================================================
    // DEPTH LIMIT
    // ========================================================================

    describe("depth limit", () => {
        it("should enforce max folder depth of 5", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create folders up to depth 4 (max allowed)
                const level0 = await seedFolder(client, workspace.id, user.id, { name: "Level 0" });
                const level1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Level 1",
                    parent_id: level0.id
                });
                const level2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Level 2",
                    parent_id: level1.id
                });
                const level3 = await seedFolder(client, workspace.id, user.id, {
                    name: "Level 3",
                    parent_id: level2.id
                });
                const level4 = await seedFolder(client, workspace.id, user.id, {
                    name: "Level 4",
                    parent_id: level3.id
                });

                // Verify level 4 has depth 4
                const result = await client.query(
                    "SELECT depth FROM flowmaestro.folders WHERE id = $1",
                    [level4.id]
                );
                expect(result.rows[0].depth).toBe(4);

                // Try to create level 5 (should fail)
                await expect(
                    seedFolder(client, workspace.id, user.id, {
                        name: "Level 5",
                        parent_id: level4.id
                    })
                ).rejects.toThrow(/Maximum folder nesting depth/);
            });
        });
    });

    // ========================================================================
    // GET DESCENDANTS
    // ========================================================================

    describe("getDescendants", () => {
        it("should return all descendant IDs", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent = await seedFolder(client, workspace.id, user.id, { name: "Parent" });
                const child1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Child 1",
                    parent_id: parent.id
                });
                const child2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Child 2",
                    parent_id: parent.id
                });
                const grandchild = await seedFolder(client, workspace.id, user.id, {
                    name: "Grandchild",
                    parent_id: child1.id
                });

                // Get all descendants using recursive CTE
                const result = await client.query(
                    `WITH RECURSIVE descendants AS (
                        SELECT id FROM flowmaestro.folders
                        WHERE parent_id = $1 AND deleted_at IS NULL
                        UNION ALL
                        SELECT f.id FROM flowmaestro.folders f
                        INNER JOIN descendants d ON f.parent_id = d.id
                        WHERE f.deleted_at IS NULL
                    )
                    SELECT id FROM descendants`,
                    [parent.id]
                );

                const descendantIds = result.rows.map((r) => r.id);
                expect(descendantIds).toHaveLength(3);
                expect(descendantIds).toContain(child1.id);
                expect(descendantIds).toContain(child2.id);
                expect(descendantIds).toContain(grandchild.id);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update folder name and color", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                await client.query(
                    "UPDATE flowmaestro.folders SET name = $2, color = $3 WHERE id = $1",
                    [folder.id, "Renamed Folder", "#00ff00"]
                );

                const result = await client.query(
                    "SELECT name, color FROM flowmaestro.folders WHERE id = $1",
                    [folder.id]
                );

                expect(result.rows[0].name).toBe("Renamed Folder");
                expect(result.rows[0].color).toBe("#00ff00");
            });
        });

        it("should update folder position", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id, { position: 0 });

                await client.query("UPDATE flowmaestro.folders SET position = $2 WHERE id = $1", [
                    folder.id,
                    5
                ]);

                const result = await client.query(
                    "SELECT position FROM flowmaestro.folders WHERE id = $1",
                    [folder.id]
                );

                expect(result.rows[0].position).toBe(5);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should soft delete folder", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                await client.query(
                    "UPDATE flowmaestro.folders SET deleted_at = NOW() WHERE id = $1",
                    [folder.id]
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.folders WHERE id = $1 AND deleted_at IS NULL",
                    [folder.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should hard delete folder", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                await client.query("DELETE FROM flowmaestro.folders WHERE id = $1", [folder.id]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.folders WHERE id = $1",
                    [folder.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce unique name per parent within workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedFolder(client, workspace.id, user.id, { name: "Unique Name" });

                // Same name at root level should fail
                await expect(
                    seedFolder(client, workspace.id, user.id, { name: "Unique Name" })
                ).rejects.toThrow(/duplicate key value violates unique constraint/);
            });
        });

        it("should allow same name in different parents", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const parent1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 1"
                });
                const parent2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Parent 2"
                });

                // Same name under different parents should work
                await seedFolder(client, workspace.id, user.id, {
                    name: "Same Name",
                    parent_id: parent1.id
                });
                const folder2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Same Name",
                    parent_id: parent2.id
                });

                expect(folder2).toBeDefined();
            });
        });

        it("should prevent self-referencing parent", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                await expect(
                    client.query("UPDATE flowmaestro.folders SET parent_id = $1 WHERE id = $1", [
                        folder.id
                    ])
                ).rejects.toThrow(/check_no_self_parent/);
            });
        });
    });
});
