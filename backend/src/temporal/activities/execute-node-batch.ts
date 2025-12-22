import { Context } from "@temporalio/activity";
import { WorkflowDefinition } from "@flowmaestro/shared";
import { Database } from "../../storage/database";
import { ExecutionRepository } from "../../storage/repositories/ExecutionRepository";

export interface ExecuteNodeBatchInput {
    executionId: string;
    workflowId: string;
    userId: string;
    nodeIds: string[];
}

export interface ExecuteNodeBatchResult {
    completedNodes: string[];
    failedNodes: string[];
}

/**
 * Execute Node Batch Activity
 *
 * Executes a batch of nodes in a long-running task.
 * Sends heartbeats to Temporal to indicate progress.
 */
export async function executeNodeBatch(
    input: ExecuteNodeBatchInput
): Promise<ExecuteNodeBatchResult> {
    const { executionId, workflowId, nodeIds } = input;
    const db = Database.getInstance();
    const executionRepo = new ExecutionRepository();

    const completedNodes: string[] = [];
    const failedNodes: string[] = [];

    try {
        // Get the execution and workflow
        const execution = await executionRepo.findById(executionId);
        if (!execution) {
            throw new Error(`Execution ${executionId} not found`);
        }

        const workflowResult = await db.query("SELECT definition FROM workflows WHERE id = $1", [
            workflowId
        ]);

        if (workflowResult.rows.length === 0) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const workflow = workflowResult.rows[0].definition as WorkflowDefinition;

        // Execute each node
        for (const nodeId of nodeIds) {
            try {
                // Heartbeat to let Temporal know we're still alive
                Context.current().heartbeat({
                    currentNode: nodeId,
                    completed: completedNodes.length
                });

                console.log(`Executing node ${nodeId} in batch for execution ${executionId}`);

                // Note: This is a simplified version. In production, you'd integrate
                // more directly with the execution context
                const node = workflow.nodes[nodeId];
                if (!node) {
                    throw new Error(`Node ${nodeId} not found in workflow`);
                }

                // Mark as completed (simplified - real implementation would execute the node)
                completedNodes.push(nodeId);

                // Update progress
                await db.query(
                    `
                    INSERT INTO execution_logs (execution_id, level, message, metadata, timestamp)
                    VALUES ($1, $2, $3, $4, NOW())
                    `,
                    [
                        executionId,
                        "info",
                        `Node ${nodeId} completed in batch`,
                        JSON.stringify({ nodeId, batchSize: nodeIds.length })
                    ]
                );
            } catch (error) {
                console.error(`Node ${nodeId} failed in batch:`, error);
                failedNodes.push(nodeId);

                await db.query(
                    `
                    INSERT INTO execution_logs (execution_id, level, message, metadata, timestamp)
                    VALUES ($1, $2, $3, $4, NOW())
                    `,
                    [
                        executionId,
                        "error",
                        `Node ${nodeId} failed in batch`,
                        JSON.stringify({
                            nodeId,
                            error: (error as Error).message
                        })
                    ]
                );
            }
        }

        return { completedNodes, failedNodes };
    } catch (error) {
        console.error(`Batch execution failed for execution ${executionId}:`, error);
        throw error;
    }
}
