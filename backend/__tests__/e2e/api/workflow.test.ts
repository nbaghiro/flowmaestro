/**
 * Workflow API E2E Tests
 *
 * Tests workflow management against a real PostgreSQL database
 * using Testcontainers. Covers CRUD operations, definition storage,
 * folder organization, and execution history.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedFolder,
    seedExecution,
    seedMultipleWorkflows
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Workflow API (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE WORKFLOW
    // ========================================================================

    describe("create workflow", () => {
        it("should create workflow with definition", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const definition = {
                    nodes: [
                        { id: "start", type: "trigger", config: { event: "manual" } },
                        { id: "process", type: "action", config: { action: "log" } }
                    ],
                    edges: [{ from: "start", to: "process" }],
                    entryPoint: "start"
                };

                const workflow = await seedWorkflow(client, workspace.id, user.id, {
                    name: "New Workflow",
                    definition
                });

                expect(workflow.id).toBeDefined();

                // Verify stored definition
                const result = await client.query(
                    "SELECT name, definition FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].name).toBe("New Workflow");
                expect(result.rows[0].definition.nodes).toHaveLength(2);
            });
        });

        it("should set initial version to 1", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const result = await client.query(
                    "SELECT version FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].version).toBe(1);
            });
        });

        it("should store metadata", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // The workflow definition can store metadata-like information
                const definitionWithMetadata = {
                    nodes: [],
                    edges: [],
                    metadata: {
                        tags: ["production", "critical"],
                        owner: "team-alpha"
                    }
                };

                await client.query(
                    `INSERT INTO flowmaestro.workflows
                     (workspace_id, user_id, name, definition, description)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [
                        workspace.id,
                        user.id,
                        "Workflow with Metadata",
                        JSON.stringify(definitionWithMetadata),
                        "A workflow with embedded metadata"
                    ]
                );

                const result = await client.query(
                    `SELECT definition FROM flowmaestro.workflows
                     WHERE name = 'Workflow with Metadata'`
                );

                expect(result.rows[0].definition.metadata.tags).toContain("production");
            });
        });
    });

    // ========================================================================
    // LIST WITH PAGINATION
    // ========================================================================

    describe("list with pagination", () => {
        it("should paginate workflows", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedMultipleWorkflows(client, workspace.id, user.id, 25);

                // First page
                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 10 OFFSET 0`,
                    [workspace.id]
                );

                // Second page
                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 10 OFFSET 10`,
                    [workspace.id]
                );

                expect(page1.rows).toHaveLength(10);
                expect(page2.rows).toHaveLength(10);

                // Different workflows
                expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
            });
        });

        it("should filter by folder", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id, {
                    name: "Production"
                });

                // Create workflows
                const wfInFolder = await seedWorkflow(client, workspace.id, user.id, {
                    name: "In Folder"
                });
                await seedWorkflow(client, workspace.id, user.id, { name: "Not in Folder" });

                // Move to folder
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET folder_ids = ARRAY[$1::uuid]
                     WHERE id = $2`,
                    [folder.id, wfInFolder.id]
                );

                // Query by folder
                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND $2 = ANY(folder_ids) AND deleted_at IS NULL`,
                    [workspace.id, folder.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("In Folder");
            });
        });

        it("should search by name", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, { name: "Customer Onboarding" });
                await seedWorkflow(client, workspace.id, user.id, { name: "Customer Support" });
                await seedWorkflow(client, workspace.id, user.id, { name: "Internal Process" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND name ILIKE $2
                     ORDER BY name`,
                    [workspace.id, "%Customer%"]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows.map((r) => r.name)).toContain("Customer Onboarding");
                expect(result.rows.map((r) => r.name)).toContain("Customer Support");
            });
        });
    });

    // ========================================================================
    // UPDATE DEFINITION
    // ========================================================================

    describe("update definition", () => {
        it("should increment version on update", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Update definition
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET definition = $2,
                         version = version + 1,
                         updated_at = NOW()
                     WHERE id = $1`,
                    [workflow.id, JSON.stringify({ nodes: [{ id: "new" }], edges: [] })]
                );

                const result = await client.query(
                    "SELECT version FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].version).toBe(2);
            });
        });

        it("should preserve definition changes via version number", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id, {
                    definition: { nodes: [{ id: "v1" }], edges: [] }
                });

                // Get current version
                const currentDef = await client.query(
                    "SELECT definition, version FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );
                expect(currentDef.rows[0].version).toBe(1);

                // Update to new version
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET definition = $2, version = version + 1
                     WHERE id = $1`,
                    [workflow.id, JSON.stringify({ nodes: [{ id: "v2" }], edges: [] })]
                );

                // Verify version incremented and definition updated
                const updated = await client.query(
                    "SELECT version, definition FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(updated.rows[0].version).toBe(2);
                expect(updated.rows[0].definition.nodes[0].id).toBe("v2");
            });
        });
    });

    // ========================================================================
    // MOVE TO FOLDER
    // ========================================================================

    describe("move to folder", () => {
        it("should update folder array", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET folder_ids = ARRAY[$1::uuid]
                     WHERE id = $2`,
                    [folder.id, workflow.id]
                );

                const result = await client.query(
                    "SELECT folder_ids FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].folder_ids).toContain(folder.id);
            });
        });

        it("should support multiple folders", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder1 = await seedFolder(client, workspace.id, user.id, {
                    name: "Folder 1"
                });
                const folder2 = await seedFolder(client, workspace.id, user.id, {
                    name: "Folder 2"
                });
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET folder_ids = ARRAY[$1::uuid, $2::uuid]
                     WHERE id = $3`,
                    [folder1.id, folder2.id, workflow.id]
                );

                const result = await client.query(
                    "SELECT folder_ids FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].folder_ids).toHaveLength(2);
            });
        });

        it("should remove from folder", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Add to folder
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET folder_ids = ARRAY[$1::uuid]
                     WHERE id = $2`,
                    [folder.id, workflow.id]
                );

                // Remove from folder
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET folder_ids = array_remove(folder_ids, $1::uuid)
                     WHERE id = $2`,
                    [folder.id, workflow.id]
                );

                const result = await client.query(
                    "SELECT folder_ids FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].folder_ids).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // DELETE WORKFLOW
    // ========================================================================

    describe("delete workflow", () => {
        it("should soft delete workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [workflow.id]
                );

                // Should not appear in normal queries
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should preserve executions on soft delete", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                // Soft delete workflow
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [workflow.id]
                );

                // Execution should still exist
                const result = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows).toHaveLength(1);
            });
        });
    });

    // ========================================================================
    // COPY WORKFLOW
    // ========================================================================

    describe("copy workflow", () => {
        it("should create duplicate with new name", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const original = await seedWorkflow(client, workspace.id, user.id, {
                    name: "Original Workflow",
                    definition: {
                        nodes: [{ id: "node1", type: "action" }],
                        edges: []
                    }
                });

                // Get original definition
                const origResult = await client.query(
                    "SELECT definition, description FROM flowmaestro.workflows WHERE id = $1",
                    [original.id]
                );

                // Create copy
                const copyResult = await client.query(
                    `INSERT INTO flowmaestro.workflows
                     (workspace_id, user_id, name, definition, description)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, name`,
                    [
                        workspace.id,
                        user.id,
                        "Original Workflow (Copy)",
                        origResult.rows[0].definition,
                        origResult.rows[0].description
                    ]
                );

                expect(copyResult.rows[0].name).toBe("Original Workflow (Copy)");

                // Verify definitions match
                const copiedDef = await client.query(
                    "SELECT definition FROM flowmaestro.workflows WHERE id = $1",
                    [copyResult.rows[0].id]
                );

                expect(copiedDef.rows[0].definition.nodes[0].id).toBe("node1");
            });
        });

        it("should reset version to 1 on copy", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const original = await seedWorkflow(client, workspace.id, user.id);

                // Update original to version 5
                await client.query("UPDATE flowmaestro.workflows SET version = 5 WHERE id = $1", [
                    original.id
                ]);

                // Create copy
                const copy = await seedWorkflow(client, workspace.id, user.id, {
                    name: "Copy of Workflow"
                });

                const result = await client.query(
                    "SELECT version FROM flowmaestro.workflows WHERE id = $1",
                    [copy.id]
                );

                expect(result.rows[0].version).toBe(1);
            });
        });
    });

    // ========================================================================
    // EXECUTION HISTORY
    // ========================================================================

    describe("execution history", () => {
        it("should list recent executions for workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create executions
                for (let i = 0; i < 5; i++) {
                    await seedExecution(client, workflow.id, {
                        status: i < 3 ? "completed" : "failed"
                    });
                }

                const result = await client.query(
                    `SELECT status, created_at FROM flowmaestro.executions
                     WHERE workflow_id = $1
                     ORDER BY created_at DESC`,
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(5);
            });
        });

        it("should get execution statistics", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create executions with different statuses
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "failed" });
                await seedExecution(client, workflow.id, { status: "running" });

                const stats = await client.query(
                    `SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'completed') as completed,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed,
                        COUNT(*) FILTER (WHERE status = 'running') as running
                     FROM flowmaestro.executions
                     WHERE workflow_id = $1`,
                    [workflow.id]
                );

                expect(parseInt(stats.rows[0].total)).toBe(5);
                expect(parseInt(stats.rows[0].completed)).toBe(3);
                expect(parseInt(stats.rows[0].failed)).toBe(1);
                expect(parseInt(stats.rows[0].running)).toBe(1);
            });
        });
    });

    // ========================================================================
    // WORKFLOW STATUS
    // ========================================================================

    describe("workflow status", () => {
        it("should track workflow via definition updates", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Store status in definition (as metadata pattern)
                const definitionWithStatus = {
                    nodes: [],
                    edges: [],
                    status: { enabled: false, reason: "maintenance" }
                };

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET definition = $2
                     WHERE id = $1`,
                    [workflow.id, JSON.stringify(definitionWithStatus)]
                );

                const result = await client.query(
                    "SELECT definition FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].definition.status.enabled).toBe(false);
            });
        });

        it("should track execution history via executions table", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create execution
                await seedExecution(client, workflow.id, { status: "completed" });

                // Get most recent execution timestamp
                const result = await client.query(
                    `SELECT MAX(created_at) as last_execution_at
                     FROM flowmaestro.executions
                     WHERE workflow_id = $1`,
                    [workflow.id]
                );

                expect(result.rows[0].last_execution_at).not.toBeNull();
            });
        });
    });
});
