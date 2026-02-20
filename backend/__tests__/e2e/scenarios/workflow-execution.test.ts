/**
 * Workflow Execution Scenario E2E Tests
 *
 * Tests complete workflow execution lifecycle against a real PostgreSQL database
 * using Testcontainers. Covers creation, execution, completion, failure,
 * and cancellation scenarios.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedExecution,
    seedExecutionWithLogs
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Workflow Execution Scenarios (Real PostgreSQL)", () => {
    // ========================================================================
    // FULL WORKFLOW LIFECYCLE
    // ========================================================================

    describe("full workflow lifecycle", () => {
        it("should complete full lifecycle: create → execute → complete", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // 1. Create workflow
                const workflow = await seedWorkflow(client, workspace.id, user.id, {
                    name: "Lifecycle Test Workflow",
                    definition: {
                        nodes: [
                            { id: "start", type: "trigger" },
                            { id: "process", type: "action" },
                            { id: "end", type: "output" }
                        ],
                        edges: [
                            { from: "start", to: "process" },
                            { from: "process", to: "end" }
                        ]
                    }
                });

                expect(workflow.id).toBeDefined();

                // 2. Create execution
                const execution = await seedExecution(client, workflow.id, {
                    status: "pending",
                    inputs: { trigger: "manual" }
                });

                expect(execution.status).toBe("pending");

                // 3. Start execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'running', started_at = NOW(), current_state = $2
                     WHERE id = $1`,
                    [execution.id, JSON.stringify({ step: "start" })]
                );

                // 4. Progress through steps
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET current_state = $2
                     WHERE id = $1`,
                    [execution.id, JSON.stringify({ step: "process", progress: 50 })]
                );

                // 5. Complete execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'completed', completed_at = NOW(),
                         outputs = $2, current_state = $3
                     WHERE id = $1`,
                    [
                        execution.id,
                        JSON.stringify({ result: "success" }),
                        JSON.stringify({ step: "end", progress: 100 })
                    ]
                );

                // Verify final state
                const result = await client.query(
                    `SELECT status, outputs, current_state, started_at, completed_at
                     FROM flowmaestro.executions WHERE id = $1`,
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("completed");
                expect(result.rows[0].outputs).toEqual({ result: "success" });
                expect(result.rows[0].started_at).not.toBeNull();
                expect(result.rows[0].completed_at).not.toBeNull();
            });
        });

        it("should track execution duration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                // Start execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET started_at = NOW() - INTERVAL '30 seconds'
                     WHERE id = $1`,
                    [execution.id]
                );

                // Complete execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'completed', completed_at = NOW()
                     WHERE id = $1`,
                    [execution.id]
                );

                // Verify duration
                const result = await client.query(
                    `SELECT EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
                     FROM flowmaestro.executions WHERE id = $1`,
                    [execution.id]
                );

                expect(parseFloat(result.rows[0].duration_seconds)).toBeGreaterThanOrEqual(30);
            });
        });
    });

    // ========================================================================
    // EXECUTION WITH LOGS
    // ========================================================================

    describe("execution with logs", () => {
        it("should create execution with associated logs", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                const { execution, logs } = await seedExecutionWithLogs(client, workflow.id, 5);

                expect(execution.id).toBeDefined();
                expect(logs).toHaveLength(5);

                // Verify logs are linked to execution
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.execution_logs
                     WHERE execution_id = $1`,
                    [execution.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(5);
            });
        });

        it("should retrieve logs in chronological order", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                // Add logs with specific created_at timestamps
                for (let i = 0; i < 3; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.execution_logs
                         (execution_id, level, message, metadata)
                         VALUES ($1, $2, $3, $4)`,
                        [
                            execution.id,
                            "info",
                            `Log message ${i + 1}`,
                            JSON.stringify({ order: i + 1 })
                        ]
                    );
                    // Small delay to ensure different timestamps
                    await new Promise((r) => setTimeout(r, 10));
                }

                // Retrieve in order
                const result = await client.query(
                    `SELECT message, metadata FROM flowmaestro.execution_logs
                     WHERE execution_id = $1
                     ORDER BY created_at ASC`,
                    [execution.id]
                );

                expect(result.rows).toHaveLength(3);
                expect(result.rows[0].metadata.order).toBe(1);
                expect(result.rows[1].metadata.order).toBe(2);
                expect(result.rows[2].metadata.order).toBe(3);
            });
        });

        it("should filter logs by level", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id);

                // Add logs with different levels
                const levels = ["debug", "info", "warn", "error"];
                for (const level of levels) {
                    await client.query(
                        `INSERT INTO flowmaestro.execution_logs
                         (execution_id, level, message)
                         VALUES ($1, $2, $3)`,
                        [execution.id, level, `${level} message`]
                    );
                }

                // Filter for error and warn only
                const result = await client.query(
                    `SELECT level, message FROM flowmaestro.execution_logs
                     WHERE execution_id = $1 AND level IN ('error', 'warn')
                     ORDER BY level`,
                    [execution.id]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows.map((r) => r.level).sort()).toEqual(["error", "warn"]);
            });
        });
    });

    // ========================================================================
    // FAILED EXECUTION
    // ========================================================================

    describe("failed execution", () => {
        it("should handle execution failure with error details", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                const errorDetails = {
                    code: "NODE_EXECUTION_ERROR",
                    message: "Failed to execute action node",
                    node_id: "action-1",
                    stack: "Error: Failed to execute..."
                };

                // Fail the execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'failed',
                         completed_at = NOW(),
                         outputs = $2
                     WHERE id = $1`,
                    [execution.id, JSON.stringify({ error: errorDetails })]
                );

                // Verify failure state
                const result = await client.query(
                    "SELECT status, outputs FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("failed");
                expect(result.rows[0].outputs.error.code).toBe("NODE_EXECUTION_ERROR");
            });
        });

        it("should log error entries on failure", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                // Add error log
                await client.query(
                    `INSERT INTO flowmaestro.execution_logs
                     (execution_id, level, message, metadata)
                     VALUES ($1, 'error', $2, $3)`,
                    [
                        execution.id,
                        "Execution failed at node action-1",
                        JSON.stringify({
                            node_id: "action-1",
                            error_type: "RuntimeError"
                        })
                    ]
                );

                // Verify error log exists
                const result = await client.query(
                    `SELECT * FROM flowmaestro.execution_logs
                     WHERE execution_id = $1 AND level = 'error'`,
                    [execution.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].metadata.node_id).toBe("action-1");
            });
        });
    });

    // ========================================================================
    // MULTIPLE EXECUTIONS
    // ========================================================================

    describe("multiple executions", () => {
        it("should handle concurrent executions of same workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create multiple executions
                const executions = [];
                for (let i = 0; i < 5; i++) {
                    const execution = await seedExecution(client, workflow.id, {
                        status: "running",
                        inputs: { run_number: i + 1 }
                    });
                    executions.push(execution);
                }

                // Verify all executions exist
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.executions
                     WHERE workflow_id = $1`,
                    [workflow.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(5);

                // Each execution should have unique inputs
                const inputsResult = await client.query(
                    `SELECT inputs FROM flowmaestro.executions
                     WHERE workflow_id = $1 ORDER BY (inputs->>'run_number')::int`,
                    [workflow.id]
                );

                expect(inputsResult.rows.map((r) => r.inputs.run_number)).toEqual([1, 2, 3, 4, 5]);
            });
        });

        it("should track execution history for workflow", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);

                // Create executions with different statuses
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "completed" });
                await seedExecution(client, workflow.id, { status: "failed" });
                await seedExecution(client, workflow.id, { status: "running" });

                // Get execution statistics
                const result = await client.query(
                    `SELECT status, COUNT(*) as count
                     FROM flowmaestro.executions
                     WHERE workflow_id = $1
                     GROUP BY status`,
                    [workflow.id]
                );

                const stats: Record<string, number> = {};
                result.rows.forEach((row) => {
                    stats[row.status] = parseInt(row.count);
                });

                expect(stats.completed).toBe(2);
                expect(stats.failed).toBe(1);
                expect(stats.running).toBe(1);
            });
        });
    });

    // ========================================================================
    // EXECUTION CANCELLATION
    // ========================================================================

    describe("execution cancellation", () => {
        it("should cancel running execution", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                // Cancel execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'cancelled', completed_at = NOW()
                     WHERE id = $1`,
                    [execution.id]
                );

                // Verify cancellation
                const result = await client.query(
                    "SELECT status, completed_at FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("cancelled");
                expect(result.rows[0].completed_at).not.toBeNull();
            });
        });

        it("should not cancel already completed execution", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "completed"
                });

                // Try to cancel (should not change status)
                const updateResult = await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'cancelled'
                     WHERE id = $1 AND status = 'running'
                     RETURNING id`,
                    [execution.id]
                );

                expect(updateResult.rowCount).toBe(0);

                // Verify status unchanged
                const result = await client.query(
                    "SELECT status FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("completed");
            });
        });

        it("should track cancellation in execution status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                // Add a log entry before cancellation
                await client.query(
                    `INSERT INTO flowmaestro.execution_logs
                     (execution_id, node_id, level, message)
                     VALUES ($1, $2, $3, $4)`,
                    [execution.id, "node_1", "info", "Processing started"]
                );

                // Cancel execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'cancelled', completed_at = NOW()
                     WHERE id = $1`,
                    [execution.id]
                );

                // Verify execution is cancelled
                const result = await client.query(
                    "SELECT status, completed_at FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("cancelled");
                expect(result.rows[0].completed_at).not.toBeNull();

                // Verify log entry exists
                const logResult = await client.query(
                    "SELECT * FROM flowmaestro.execution_logs WHERE execution_id = $1",
                    [execution.id]
                );
                expect(logResult.rows).toHaveLength(1);
                expect(logResult.rows[0].level).toBe("info");
            });
        });
    });

    // ========================================================================
    // PAUSE AND RESUME
    // ========================================================================

    describe("pause and resume", () => {
        it("should pause execution with context", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "running"
                });

                const pauseContext = {
                    paused_at_node: "approval-node",
                    awaiting_input: true,
                    input_schema: { type: "object", properties: { approved: { type: "boolean" } } }
                };

                // Pause execution
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'paused', pause_context = $2
                     WHERE id = $1`,
                    [execution.id, JSON.stringify(pauseContext)]
                );

                // Verify pause state
                const result = await client.query(
                    "SELECT status, pause_context FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("paused");
                expect(result.rows[0].pause_context.paused_at_node).toBe("approval-node");
            });
        });

        it("should resume paused execution", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const workflow = await seedWorkflow(client, workspace.id, user.id);
                const execution = await seedExecution(client, workflow.id, {
                    status: "paused",
                    pause_context: {
                        paused_at_node: "approval-node",
                        awaiting_input: true
                    }
                });

                // Resume with user input
                await client.query(
                    `UPDATE flowmaestro.executions
                     SET status = 'running',
                         pause_context = NULL,
                         inputs = COALESCE(inputs, '{}'::jsonb) || $2::jsonb
                     WHERE id = $1`,
                    [execution.id, JSON.stringify({ user_input: { approved: true } })]
                );

                // Verify resumed state
                const result = await client.query(
                    "SELECT status, pause_context, inputs FROM flowmaestro.executions WHERE id = $1",
                    [execution.id]
                );

                expect(result.rows[0].status).toBe("running");
                expect(result.rows[0].pause_context).toBeNull();
                expect(result.rows[0].inputs.user_input.approved).toBe(true);
            });
        });
    });
});
