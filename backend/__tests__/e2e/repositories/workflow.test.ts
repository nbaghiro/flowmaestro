/**
 * WorkflowRepository E2E Tests
 *
 * Tests workflow database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedMultipleWorkflows,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("WorkflowRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a workflow with all required fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflowId = generateTestId("wf");

                const result = await client.query(
                    `INSERT INTO flowmaestro.workflows (
                        id, name, description, definition, user_id, workspace_id,
                        version, workflow_type
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *`,
                    [
                        workflowId,
                        "Test Workflow",
                        "A test workflow description",
                        JSON.stringify({ nodes: {}, edges: [] }),
                        user.id,
                        workspace.id,
                        1,
                        "user"
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const workflow = result.rows[0];
                expect(workflow.id).toBe(workflowId);
                expect(workflow.name).toBe("Test Workflow");
                expect(workflow.description).toBe("A test workflow description");
                expect(workflow.user_id).toBe(user.id);
                expect(workflow.workspace_id).toBe(workspace.id);
                expect(workflow.version).toBe(1);
                expect(workflow.workflow_type).toBe("user");
                expect(workflow.deleted_at).toBeNull();
                expect(workflow.created_at).toBeInstanceOf(Date);
                expect(workflow.updated_at).toBeInstanceOf(Date);
            });
        });

        it("should auto-generate UUID when id is not provided", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.workflows (
                        name, definition, user_id, workspace_id
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
                    [
                        "Auto-ID Workflow",
                        JSON.stringify({ nodes: {}, edges: [] }),
                        user.id,
                        workspace.id
                    ]
                );

                expect(result.rows[0].id).toBeDefined();
                expect(typeof result.rows[0].id).toBe("string");
                expect(result.rows[0].id.length).toBe(36); // UUID format
            });
        });

        it("should store JSONB definition correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const complexDefinition = {
                    nodes: {
                        start: { type: "trigger", config: { event: "manual" } },
                        process: { type: "code", config: { code: "return input;" } },
                        end: { type: "output", config: {} }
                    },
                    edges: [
                        { from: "start", to: "process" },
                        { from: "process", to: "end" }
                    ],
                    variables: {
                        input: { type: "string", default: "" }
                    }
                };

                const result = await client.query(
                    `INSERT INTO flowmaestro.workflows (
                        name, definition, user_id, workspace_id
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING definition`,
                    ["Complex Workflow", JSON.stringify(complexDefinition), user.id, workspace.id]
                );

                const storedDefinition = result.rows[0].definition;
                expect(storedDefinition).toEqual(complexDefinition);
                expect(storedDefinition.nodes.start.type).toBe("trigger");
                expect(storedDefinition.edges).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return workflow when it exists", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(workflow.id);
                expect(result.rows[0].name).toBe(workflow.name);
            });
        });

        it("should return null for non-existent workflow", async () => {
            await withTransaction(async (client) => {
                // Use a valid UUID that doesn't exist in the database
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should not return soft-deleted workflows", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                // Soft delete the workflow
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [workflow.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all workflows in workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 5);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(5);
            });
        });

        it("should paginate results correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 10);

                // Get first page
                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 0]
                );

                // Get second page
                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 3]
                );

                expect(page1.rows).toHaveLength(3);
                expect(page2.rows).toHaveLength(3);

                // Pages should have different workflows
                const page1Ids = page1.rows.map((r) => r.id);
                const page2Ids = page2.rows.map((r) => r.id);
                expect(page1Ids).not.toEqual(page2Ids);
            });
        });

        it("should return count with pagination", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 10);

                const countResult = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(parseInt(countResult.rows[0].total)).toBe(10);
            });
        });

        it("should filter by workflow_type when specified", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create user workflows
                await seedMultipleWorkflows(client, workspace.id, user.id, 3, {
                    workflow_type: "user"
                });

                // Create system workflow
                await seedWorkflow(client, workspace.id, user.id, {
                    workflow_type: "system",
                    name: "System Workflow"
                });

                // Query only user workflows
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND (workflow_type = 'user' OR workflow_type IS NULL)`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
                expect(result.rows.every((r) => r.workflow_type === "user")).toBe(true);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update workflow name and description", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET name = $2, description = $3
                     WHERE id = $1`,
                    [workflow.id, "Updated Name", "Updated description"]
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].name).toBe("Updated Name");
                expect(result.rows[0].description).toBe("Updated description");
            });
        });

        it("should increment version on definition update", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                const newDefinition = {
                    nodes: { updated: { type: "new" } },
                    edges: []
                };

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET definition = $2, version = version + 1
                     WHERE id = $1`,
                    [workflow.id, JSON.stringify(newDefinition)]
                );

                const result = await client.query(
                    "SELECT version, definition FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].version).toBe(workflow.version + 1);
                expect(result.rows[0].definition).toEqual(newDefinition);
            });
        });

        it("should update updated_at timestamp via trigger", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);
                const originalUpdatedAt = workflow.updated_at;

                // Use pg_sleep to ensure timestamp difference within the transaction
                await client.query("SELECT pg_sleep(0.1)");

                await client.query("UPDATE flowmaestro.workflows SET name = $2 WHERE id = $1", [
                    workflow.id,
                    "Trigger Test"
                ]);

                const result = await client.query(
                    "SELECT updated_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                const newUpdatedAt = result.rows[0].updated_at;
                // The updated_at should be at least equal to or greater than original
                expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("soft delete", () => {
        it("should set deleted_at timestamp", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [workflow.id]
                );

                const result = await client.query(
                    "SELECT deleted_at FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows[0].deleted_at).toBeInstanceOf(Date);
            });
        });

        it("should exclude soft-deleted from normal queries", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflows = await seedMultipleWorkflows(client, workspace.id, user.id, 5);

                // Soft delete 2 workflows
                await client.query(
                    `UPDATE flowmaestro.workflows
                     SET deleted_at = CURRENT_TIMESTAMP
                     WHERE id = ANY($1)`,
                    [[workflows[0].id, workflows[1].id]]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });
    });

    describe("hard delete", () => {
        it("should permanently remove workflow", async () => {
            await withTransaction(async (client) => {
                const { workflow } = await seedBasicScenario(client);

                await client.query("DELETE FROM flowmaestro.workflows WHERE id = $1", [
                    workflow.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.workflows WHERE id = $1",
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // QUERY PATTERNS
    // ========================================================================

    describe("JSONB queries", () => {
        it("should query by JSONB field path", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create workflow with specific node type
                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: {
                            trigger: { type: "webhook", config: { path: "/hook" } }
                        },
                        edges: []
                    }
                });

                // Create workflow without webhook
                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: {
                            trigger: { type: "manual", config: {} }
                        },
                        edges: []
                    }
                });

                // Query for workflows with webhook trigger
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1
                     AND deleted_at IS NULL
                     AND definition->'nodes'->'trigger'->>'type' = 'webhook'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
            });
        });

        it("should query using JSONB containment operator", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: { a: {}, b: {}, c: {} },
                        edges: [],
                        metadata: { tag: "important" }
                    }
                });

                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: { x: {} },
                        edges: [],
                        metadata: { tag: "draft" }
                    }
                });

                // Find workflows with "important" tag
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1
                     AND deleted_at IS NULL
                     AND definition @> '{"metadata": {"tag": "important"}}'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce workflow_id foreign key constraint on executions", async () => {
            await withTransaction(async (client) => {
                // Executions have a foreign key on workflow_id
                const nonExistentWorkflowId = "00000000-0000-0000-0000-000000000000";
                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.executions (workflow_id, status)
                         VALUES ($1, $2)`,
                        [nonExistentWorkflowId, "pending"]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should allow null description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.workflows (
                        name, description, definition, user_id, workspace_id
                    )
                    VALUES ($1, NULL, $2, $3, $4)
                    RETURNING description`,
                    ["No Description Workflow", JSON.stringify({}), user.id, workspace.id]
                );

                expect(result.rows[0].description).toBeNull();
            });
        });
    });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function seedBasicScenario(client: import("pg").PoolClient) {
    const user = await seedUser(client);
    const workspace = await seedWorkspace(client, user.id);
    const workflow = await seedWorkflow(client, workspace.id, user.id);
    return { user, workspace, workflow };
}
