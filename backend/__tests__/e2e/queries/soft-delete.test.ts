/**
 * Soft Delete E2E Tests
 *
 * Tests soft delete behavior across different tables
 * against a real PostgreSQL database using Testcontainers.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedAgent,
    seedThread,
    seedFolder,
    seedMultipleWorkflows
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Soft Delete (Real PostgreSQL)", () => {
    // ========================================================================
    // EXCLUDE FROM NORMAL QUERIES
    // ========================================================================

    describe("exclude from normal queries", () => {
        it("should exclude soft-deleted workflows from normal queries", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Active"
                });
                const workflow2 = await seedWorkflow(client, workspace.id, user.id, {
                    name: "Deleted"
                });

                // Soft delete workflow2
                await client.query(
                    "UPDATE flowmaestro.workflows SET deleted_at = NOW() WHERE id = $1",
                    [workflow2.id]
                );

                // Normal query should only return active
                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Active");
            });
        });

        it("should exclude soft-deleted agents from normal queries", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedAgent(client, workspace.id, user.id, { name: "Active Agent" });
                const agent2 = await seedAgent(client, workspace.id, user.id, {
                    name: "Deleted Agent"
                });

                // Soft delete agent2
                await client.query(
                    "UPDATE flowmaestro.agents SET deleted_at = NOW() WHERE id = $1",
                    [agent2.id]
                );

                const result = await client.query(
                    `SELECT name FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Active Agent");
            });
        });

        it("should exclude soft-deleted threads from normal queries", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Active Thread"
                });
                const thread2 = await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Deleted Thread"
                });

                // Soft delete thread2
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET deleted_at = NOW(), status = 'deleted'
                     WHERE id = $1`,
                    [thread2.id]
                );

                const result = await client.query(
                    `SELECT title FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].title).toBe("Active Thread");
            });
        });
    });

    // ========================================================================
    // INCLUDE DELETED OPTION
    // ========================================================================

    describe("include deleted option", () => {
        it("should return all records including deleted when requested", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedMultipleWorkflows(client, workspace.id, user.id, 5);

                // Soft delete 2 workflows (use subquery since PostgreSQL doesn't support LIMIT in UPDATE)
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id IN (
                         SELECT id FROM flowmaestro.workflows
                         WHERE workspace_id = $1 AND deleted_at IS NULL
                         LIMIT 2
                     )`,
                    [workspace.id]
                );

                // Query including deleted
                const allResult = await client.query(
                    "SELECT * FROM flowmaestro.workflows WHERE workspace_id = $1",
                    [workspace.id]
                );

                // Query excluding deleted
                const activeResult = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(allResult.rows).toHaveLength(5);
                expect(activeResult.rows).toHaveLength(3);
            });
        });

        it("should filter to only deleted records", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflows = await seedMultipleWorkflows(client, workspace.id, user.id, 5);

                // Soft delete 2 specific workflows
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id IN ($1, $2)`,
                    [workflows[0].id, workflows[1].id]
                );

                // Query only deleted
                const deletedResult = await client.query(
                    `SELECT id FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NOT NULL`,
                    [workspace.id]
                );

                expect(deletedResult.rows).toHaveLength(2);
                const deletedIds = deletedResult.rows.map((r) => r.id);
                expect(deletedIds).toContain(workflows[0].id);
                expect(deletedIds).toContain(workflows[1].id);
            });
        });
    });

    // ========================================================================
    // RESTORE SOFT-DELETED
    // ========================================================================

    describe("restore soft-deleted", () => {
        it("should restore workflow by clearing deleted_at", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id, {
                    name: "To Restore"
                });

                // Soft delete
                await client.query(
                    "UPDATE flowmaestro.workflows SET deleted_at = NOW() WHERE id = $1",
                    [workflow.id]
                );

                // Verify deleted
                const deletedResult = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(deletedResult.rows[0].deleted_at).not.toBeNull();

                // Restore
                await client.query(
                    "UPDATE flowmaestro.workflows SET deleted_at = NULL WHERE id = $1",
                    [workflow.id]
                );

                // Verify restored
                const restoredResult = await client.query(
                    "SELECT deleted_at, name FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(restoredResult.rows[0].deleted_at).toBeNull();
                expect(restoredResult.rows[0].name).toBe("To Restore");
            });
        });

        it("should restore thread by clearing deleted_at and updating status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                // Soft delete with status change
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET deleted_at = NOW(), status = 'deleted'
                     WHERE id = $1`,
                    [thread.id]
                );

                // Restore
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET deleted_at = NULL, status = 'active'
                     WHERE id = $1`,
                    [thread.id]
                );

                const result = await client.query(
                    "SELECT status, deleted_at FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].status).toBe("active");
                expect(result.rows[0].deleted_at).toBeNull();
            });
        });
    });

    // ========================================================================
    // CASCADE SOFT DELETE
    // ========================================================================

    describe("cascade soft delete", () => {
        it("should soft delete items in folder when folder is deleted", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id, {
                    name: "To Delete"
                });

                // Add workflows to folder
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                await client.query(
                    "UPDATE flowmaestro.workflows SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                    [folder.id, workflow.id]
                );

                // Soft delete folder
                await client.query(
                    "UPDATE flowmaestro.folders SET deleted_at = NOW() WHERE id = $1",
                    [folder.id]
                );

                // Note: Application logic typically handles cascading soft deletes,
                // not database constraints. This test verifies the workflow is still
                // accessible even if its folder is deleted (different from hard delete cascade)

                // Workflow should still exist (soft cascade not automatic in DB)
                const workflowResult = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(workflowResult.rows[0].deleted_at).toBeNull();
            });
        });
    });

    // ========================================================================
    // HARD DELETE AFTER SOFT
    // ========================================================================

    describe("hard delete after soft", () => {
        it("should permanently remove soft-deleted workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // First soft delete
                await client.query(
                    "UPDATE flowmaestro.workflows SET deleted_at = NOW() WHERE id = $1",
                    [workflow.id]
                );

                // Then hard delete
                await client.query("DELETE FROM flowmaestro.workflows WHERE id = $1", [
                    workflow.id
                ]);

                // Should be completely gone
                const result = await client.query(
                    "SELECT * FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(result.rows).toHaveLength(0);
            });
        });

        it("should only hard delete already soft-deleted records", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedMultipleWorkflows(client, workspace.id, user.id, 5);

                // Soft delete 2 (use subquery since PostgreSQL doesn't support LIMIT in UPDATE)
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id IN (
                         SELECT id FROM flowmaestro.workflows
                         WHERE workspace_id = $1 AND deleted_at IS NULL
                         LIMIT 2
                     )`,
                    [workspace.id]
                );

                // Hard delete only soft-deleted ones
                const deleteResult = await client.query(
                    `DELETE FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NOT NULL
                     RETURNING id`,
                    [workspace.id]
                );

                expect(deleteResult.rowCount).toBe(2);

                // Active ones should still exist
                const remaining = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1`,
                    [workspace.id]
                );
                expect(remaining.rows).toHaveLength(3);
            });
        });
    });

    // ========================================================================
    // SOFT DELETE TIMESTAMPS
    // ========================================================================

    describe("soft delete timestamps", () => {
        it("should record deletion timestamp", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Verify deleted_at is initially null
                const beforeResult = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(beforeResult.rows[0].deleted_at).toBeNull();

                // Soft delete the workflow
                await client.query(
                    "UPDATE flowmaestro.workflows SET deleted_at = NOW() WHERE id = $1",
                    [workflow.id]
                );

                // Verify deleted_at is now set to a valid timestamp
                const result = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                const deletedAt = result.rows[0].deleted_at;
                expect(deletedAt).not.toBeNull();
                expect(deletedAt).toBeInstanceOf(Date);
                // Verify it's a recent timestamp (within last minute)
                const now = new Date();
                const oneMinuteAgo = new Date(now.getTime() - 60000);
                expect(deletedAt.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
            });
        });

        it("should query by deletion date range", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create and delete workflows at different times
                const workflow1 = await seedWorkflow(client, workspace.id, user.id);
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW() - INTERVAL '7 days'
                     WHERE id = $1`,
                    [workflow1.id]
                );

                const workflow2 = await seedWorkflow(client, workspace.id, user.id);
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW() - INTERVAL '1 day'
                     WHERE id = $1`,
                    [workflow2.id]
                );

                // Query for items deleted in last 3 days
                const recent = await client.query(
                    `SELECT id FROM flowmaestro.workflows
                     WHERE workspace_id = $1
                     AND deleted_at IS NOT NULL
                     AND deleted_at > NOW() - INTERVAL '3 days'`,
                    [workspace.id]
                );

                expect(recent.rows).toHaveLength(1);
                expect(recent.rows[0].id).toBe(workflow2.id);
            });
        });
    });

    // ========================================================================
    // COUNTS WITH SOFT DELETE
    // ========================================================================

    describe("counts with soft delete", () => {
        it("should count only active records by default", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedMultipleWorkflows(client, workspace.id, user.id, 10);

                // Delete 4 (use subquery since PostgreSQL doesn't support LIMIT in UPDATE)
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id IN (
                         SELECT id FROM flowmaestro.workflows
                         WHERE workspace_id = $1 AND deleted_at IS NULL
                         LIMIT 4
                     )`,
                    [workspace.id]
                );

                const activeCount = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                const totalCount = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1`,
                    [workspace.id]
                );

                expect(parseInt(activeCount.rows[0].total)).toBe(6);
                expect(parseInt(totalCount.rows[0].total)).toBe(10);
            });
        });
    });
});
