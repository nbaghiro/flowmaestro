import { task, metadata } from "@trigger.dev/sdk/v3";
import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import { buildExecutionPlan } from "../workflow-builder";
import { ExecutionQueue } from "../shared/execution-queue";
import { ContextManager } from "../shared/context-manager";
import { nodeExecutor, NodeExecutorPayload } from "./node-executor";

/**
 * Payload for workflow execution.
 */
export interface WorkflowExecutionPayload {
    /** Unique execution ID (from database) */
    executionId: string;

    /** Workflow ID */
    workflowId: string;

    /** User ID executing the workflow */
    userId: string;

    /** Workflow definition (nodes, edges, settings) */
    definition: WorkflowDefinition;

    /** Input data for the workflow */
    inputs: JsonObject;

    /** How the workflow was triggered */
    triggerType?: "manual" | "webhook" | "schedule";

    /** Optional metadata */
    meta?: JsonObject;
}

/**
 * Result from workflow execution.
 */
export interface WorkflowExecutionResult {
    /** Whether the workflow completed successfully */
    success: boolean;

    /** Final outputs from terminal nodes */
    outputs: JsonObject;

    /** Node IDs that completed successfully */
    completedNodes: string[];

    /** Node IDs that failed */
    failedNodes: string[];

    /** Total execution duration in milliseconds */
    durationMs: number;

    /** Error message if workflow failed */
    error?: string;
}

/**
 * Workflow Executor Task
 *
 * Main orchestration task for executing workflows.
 * Uses the 4-stage workflow builder to create an execution plan,
 * then executes nodes in parallel batches using the node-executor subtask.
 */
export const workflowExecutor = task({
    id: "workflow-executor",
    retry: { maxAttempts: 1 },
    run: async (payload: WorkflowExecutionPayload): Promise<WorkflowExecutionResult> => {
        const startTime = Date.now();
        const { executionId, workflowId, definition, inputs, userId } = payload;

        // Set initial metadata for frontend tracking
        await metadata.set("status", "initializing");
        await metadata.set("executionId", executionId);
        await metadata.set("workflowId", workflowId);
        await metadata.set("startedAt", new Date().toISOString());

        try {
            // Stage 1: Build execution plan using 4-stage pipeline
            await metadata.set("status", "building-plan");
            const plan = buildExecutionPlan(definition);

            if (plan.warnings.length > 0) {
                await metadata.set("warnings", plan.warnings);
            }

            await metadata.set("totalNodes", plan.nodeCount);
            await metadata.set("executionLevels", plan.executionLevels.length);

            // Initialize queue and context
            const queue = new ExecutionQueue(plan);
            const context = new ContextManager(inputs);

            await metadata.set("status", "running");
            await metadata.set("completedNodes", [] as string[]);
            await metadata.set("failedNodes", [] as string[]);

            const completedNodes: string[] = [];
            const failedNodes: string[] = [];

            // Execute in parallel batches
            while (queue.hasWork()) {
                const batch = queue.getNextBatch();

                if (batch.length === 0) {
                    // No more nodes can execute (might be blocked by failures)
                    break;
                }

                await metadata.set("currentBatch", batch);
                await metadata.set("progress", queue.getProgress());

                // Prepare batch payloads
                const batchPayloads = batch.map((nodeId) => {
                    const node = plan.nodes.get(nodeId);
                    if (!node) {
                        throw new Error(`Node ${nodeId} not found in execution plan`);
                    }

                    const nodePayload: NodeExecutorPayload = {
                        nodeId,
                        nodeType: node.type,
                        nodeName: node.name,
                        config: node.config,
                        context: context.getSnapshot(),
                        userId,
                        executionId,
                        connectionId: node.config.connectionId as string | undefined
                    };

                    return { payload: nodePayload };
                });

                // Fan out to node executors in parallel
                const batchResult = await nodeExecutor.batchTriggerAndWait(batchPayloads);

                // Process results
                for (const result of batchResult.runs) {
                    if (result.ok) {
                        const output = result.output;

                        // Store node output
                        context.setNodeOutput(output.nodeId, output.data || {});

                        // Handle signals
                        if (output.signals?.pause) {
                            // Workflow is paused, waiting for user input
                            await metadata.set("status", "paused");
                            await metadata.set("waitpointId", output.signals.pause.waitpointId);
                            await metadata.set("pauseReason", output.signals.pause.reason);

                            // Return partial result - workflow will be resumed later
                            return {
                                success: true,
                                outputs: context.getFinalOutputs(completedNodes),
                                completedNodes,
                                failedNodes,
                                durationMs: Date.now() - startTime
                            };
                        }

                        if (output.signals?.setVariables) {
                            // Set workflow variables
                            for (const [name, value] of Object.entries(
                                output.signals.setVariables
                            )) {
                                context.setVariable(
                                    name,
                                    value as Parameters<typeof context.setVariable>[1]
                                );
                            }
                        }

                        if (output.signals?.activateErrorPort || !output.success) {
                            // Node failed or activated error port
                            queue.markFailed(output.nodeId);
                            failedNodes.push(output.nodeId);
                        } else {
                            // Node succeeded
                            queue.markCompleted(output.nodeId);
                            completedNodes.push(output.nodeId);
                        }

                        // Handle routing signals
                        if (output.signals?.selectedRoute) {
                            // Mark non-selected routes as skipped
                            // This is handled by the queue based on edge configuration
                        }
                    } else {
                        // Task itself failed - find the node by matching the run id
                        // The result.id contains the run ID, but we need the node ID
                        // Since batch results are ordered, we can use the index
                        const resultIndex = batchResult.runs.indexOf(result);
                        if (resultIndex >= 0 && resultIndex < batchPayloads.length) {
                            const failedNodeId = batchPayloads[resultIndex].payload.nodeId;
                            queue.markFailed(failedNodeId);
                            failedNodes.push(failedNodeId);
                        }
                    }

                    // Update progress
                    await metadata.set("completedNodes", completedNodes);
                    await metadata.set("failedNodes", failedNodes);
                    await metadata.set("progress", queue.getProgress());
                }

                // Prune context to save memory
                // Keep only outputs needed by remaining nodes
                const remaining = queue.getRemainingNodes();
                const neededOutputs = new Set<string>();
                for (const nodeId of remaining) {
                    const node = plan.nodes.get(nodeId);
                    if (node) {
                        for (const dep of node.dependencies) {
                            neededOutputs.add(dep);
                        }
                    }
                }
                context.pruneUnusedOutputs(neededOutputs);
            }

            // Get terminal node IDs for final output
            const terminalNodes = Array.from(plan.nodes.entries())
                .filter(([_, node]) => node.isTerminal)
                .map(([id]) => id);

            const finalOutputs = context.getFinalOutputs(
                terminalNodes.length > 0 ? terminalNodes : completedNodes
            );

            const success = failedNodes.length === 0;
            await metadata.set("status", success ? "completed" : "completed_with_errors");
            await metadata.set("completedAt", new Date().toISOString());

            return {
                success,
                outputs: finalOutputs,
                completedNodes,
                failedNodes,
                durationMs: Date.now() - startTime
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            await metadata.set("status", "failed");
            await metadata.set("error", errorMessage);
            await metadata.set("completedAt", new Date().toISOString());

            return {
                success: false,
                outputs: {},
                completedNodes: [],
                failedNodes: [],
                durationMs: Date.now() - startTime,
                error: errorMessage
            };
        }
    }
});
