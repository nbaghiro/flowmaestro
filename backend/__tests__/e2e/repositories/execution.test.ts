/**
 * ExecutionRepository E2E Tests
 *
 * Tests execution database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedExecution,
    seedExecutionLog,
    seedExecutionWithLogs,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("ExecutionRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create an execution with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const executionId = generateTestId("exec");

                const inputs = { key: "value", nested: { data: 123 } };
                const result = await client.query(
                    `INSERT INTO flowmaestro.executions (
                        id, workflow_id, status, inputs, started_at
                    )
                    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                    RETURNING *`,
                    [executionId, workflow.id, "running", JSON.stringify(inputs)]
                );

                expect(result.rows).toHaveLength(1);
                const execution = result.rows[0];
                expect(execution.id).toBe(executionId);
                expect(execution.workflow_id).toBe(workflow.id);
                expect(execution.status).toBe("running");
                expect(execution.inputs).toEqual(inputs);
                expect(execution.started_at).toBeInstanceOf(Date);
                expect(execution.completed_at).toBeNull();
            });
        });

        it("should auto-generate UUID when id is not provided", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.executions (workflow_id, status)
                     VALUES ($1, $2)
                     RETURNING id`,
                    [workflow.id, "pending"]
                );

                expect(result.rows[0].id).toBeDefined();
                expect(typeof result.rows[0].id).toBe("string");
                expect(result.rows[0].id.length).toBe(36);
            });
        });

        it("should store JSONB inputs correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const complexInputs = {
                    user: { name: "Test", email: "test@example.com" },
                    items: [1, 2, 3],
                    config: { enabled: true, threshold: 0.5 }
                };

                const execution = await seedExecution(client, workflow.id, {
                    inputs: complexInputs
                });

                const result = await client.query(
                    "SELECT inputs FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].inputs).toEqual(complexInputs);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return execution when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(execution.id);
            });
        });

        it("should return empty for non-existent execution", async () => {
            await withTransaction(async (client) => {
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE id = $1",
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByWorkflowId", () => {
        it("should return all executions for a workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create multiple executions
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "running" });
                await seedExecution(client, workflow.id, { status: "pending" });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.executions
                     WHERE workflow_id = $1
                     ORDER BY created_at DESC`,
                    [workflow.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });

        it("should paginate results correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create 10 executions
                for (let i = 0; i < 10; i++) {
                    await seedExecution(client, workflow.id);
                }

                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.executions
                     WHERE workflow_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workflow.id, 3, 0]
                );

                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.executions
                     WHERE workflow_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workflow.id, 3, 3]
                );

                expect(page1.rows).toHaveLength(3);
                expect(page2.rows).toHaveLength(3);

                const page1Ids = page1.rows.map((r) => r.id);
                const page2Ids = page2.rows.map((r) => r.id);
                expect(page1Ids).not.toEqual(page2Ids);
            });
        });
    });

    describe("findByStatus", () => {
        it("should filter executions by status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create executions with different statuses
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "running" });
                await seedExecution(client, workflow.id, { status: "failed" });
                await seedExecution(client, workflow.id, { status: "pending" });

                const completedResult = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE status = $1",
                    ["completed"]
                );

                const runningResult = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE status = $1",
                    ["running"]
                );

                expect(completedResult.rows).toHaveLength(2);
                expect(runningResult.rows).toHaveLength(1);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update execution status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, { status: "running" });

                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = $2, completed_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [execution.id, "completed"]
                );

                const result = await client.query(
                    "SELECT status, completed_at FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("completed");
                expect(result.rows[0].completed_at).toBeInstanceOf(Date);
            });
        });

        it("should update execution outputs on completion", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, { status: "running" });

                const outputs = { result: "success", data: { processed: 100 } };

                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = $2, outputs = $3, completed_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [execution.id, "completed", JSON.stringify(outputs)]
                );

                const result = await client.query(
                    "SELECT outputs FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].outputs).toEqual(outputs);
            });
        });

        it("should update pause context for paused executions", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, { status: "running" });

                const pauseContext = {
                    reason: "human_input_required",
                    node_id: "approval_node",
                    paused_at: new Date().toISOString(),
                    form_schema: { type: "object", properties: { approved: { type: "boolean" } } }
                };

                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = $2, pause_context = $3
                     WHERE id = $1`,
                    [execution.id, "paused", JSON.stringify(pauseContext)]
                );

                const result = await client.query(
                    "SELECT status, pause_context FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("paused");
                expect(result.rows[0].pause_context).toEqual(pauseContext);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should delete execution permanently", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                await client.query("DELETE FROM flowmaestro.executions WHERE id = $1", [
                    execution.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should cascade delete execution logs", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const { execution, logs } = await seedExecutionWithLogs(client, workflow.id, 5);

                expect(logs).toHaveLength(5);

                await client.query("DELETE FROM flowmaestro.executions WHERE id = $1", [
                    execution.id
                ]);

                const logResult = await client.query(
                    "SELECT * FROM flowmaestro.execution_logs WHERE execution_id = $1",
                    [execution.id]
                );

                expect(logResult.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // EXECUTION LOGS
    // ========================================================================

    describe("getLogs", () => {
        it("should return all logs for an execution", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const { execution, logs } = await seedExecutionWithLogs(client, workflow.id, 10);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1
                     ORDER BY created_at ASC`,
                    [execution.id]
                );

                expect(result.rows).toHaveLength(10);
                // Compare as numbers since id is BIGSERIAL
                expect(Number(result.rows[0].id)).toBe(logs[0].id);
            });
        });

        it("should filter logs by level", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                await seedExecutionLog(client, execution.id, { level: "info" });
                await seedExecutionLog(client, execution.id, { level: "info" });
                await seedExecutionLog(client, execution.id, { level: "error" });
                await seedExecutionLog(client, execution.id, { level: "warn" });

                const errorLogs = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1 AND level = $2`,
                    [execution.id, "error"]
                );

                expect(errorLogs.rows).toHaveLength(1);
            });
        });

        it("should filter logs by node_id", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                await seedExecutionLog(client, execution.id, { node_id: "node_1" });
                await seedExecutionLog(client, execution.id, { node_id: "node_1" });
                await seedExecutionLog(client, execution.id, { node_id: "node_2" });
                await seedExecutionLog(client, execution.id, { node_id: "node_3" });

                const node1Logs = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1 AND node_id = $2`,
                    [execution.id, "node_1"]
                );

                expect(node1Logs.rows).toHaveLength(2);
            });
        });

        it("should paginate logs correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const { execution } = await seedExecutionWithLogs(client, workflow.id, 20);

                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1
                     ORDER BY created_at ASC
                     LIMIT $2 OFFSET $3`,
                    [execution.id, 5, 0]
                );

                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1
                     ORDER BY created_at ASC
                     LIMIT $2 OFFSET $3`,
                    [execution.id, 5, 5]
                );

                expect(page1.rows).toHaveLength(5);
                expect(page2.rows).toHaveLength(5);

                const page1Ids = page1.rows.map((r) => Number(r.id));
                const page2Ids = page2.rows.map((r) => Number(r.id));
                expect(page1Ids).not.toEqual(page2Ids);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce workflow_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
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

        it("should allow null inputs and outputs", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.executions (workflow_id, status, inputs, outputs)
                     VALUES ($1, $2, NULL, NULL)
                     RETURNING inputs, outputs`,
                    [workflow.id, "pending"]
                );

                expect(result.rows[0].inputs).toBeNull();
                expect(result.rows[0].outputs).toBeNull();
            });
        });
    });
});
