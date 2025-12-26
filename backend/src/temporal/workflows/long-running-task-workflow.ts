import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";
import { createWorkflowLogger } from "../shared/workflow-logger";

const { executeNodeBatch } = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    heartbeatTimeout: "30s",
    retry: {
        initialInterval: "1s",
        maximumInterval: "30s",
        backoffCoefficient: 2,
        maximumAttempts: 5
    }
});

export interface LongRunningTaskInput {
    executionId: string;
    workflowId: string;
    userId: string;
    nodeIds: string[];
}

export interface LongRunningTaskResult {
    success: boolean;
    completedNodes: string[];
    failedNodes: string[];
    error?: string;
}

/**
 * Long-Running Task Workflow
 *
 * Handles tasks that may take longer than 5 minutes.
 * Uses Temporal activities with heartbeat for reliability.
 */
export async function longRunningTaskWorkflow(
    input: LongRunningTaskInput
): Promise<LongRunningTaskResult> {
    const { executionId, workflowId, userId, nodeIds } = input;
    const wfLogger = createWorkflowLogger({
        executionId,
        workflowName: "LongRunningTask",
        userId
    });

    wfLogger.info("Starting long-running task", { workflowId, nodeCount: nodeIds.length });

    try {
        const result = await executeNodeBatch({
            executionId,
            workflowId,
            userId,
            nodeIds
        });

        wfLogger.info("Long-running task completed", {
            completedNodes: result.completedNodes.length,
            failedNodes: result.failedNodes.length
        });

        return {
            success: true,
            completedNodes: result.completedNodes,
            failedNodes: result.failedNodes
        };
    } catch (error) {
        wfLogger.error("Long-running task failed", error as Error, { nodeIds });

        return {
            success: false,
            completedNodes: [],
            failedNodes: nodeIds,
            error: (error as Error).message
        };
    }
}
