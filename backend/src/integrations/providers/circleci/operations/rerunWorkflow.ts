import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const rerunWorkflowSchema = z.object({
    workflowId: z.string().min(1).describe("Workflow ID (UUID) to rerun"),
    fromFailed: z.boolean().optional().describe("Rerun only from failed jobs"),
    enableSsh: z.boolean().optional().describe("Enable SSH access for debugging"),
    jobs: z.array(z.string()).optional().describe("Specific job IDs to rerun"),
    sparseTree: z.boolean().optional().describe("Rerun only the specified jobs")
});

export type RerunWorkflowParams = z.infer<typeof rerunWorkflowSchema>;

export const rerunWorkflowOperation: OperationDefinition = {
    id: "rerunWorkflow",
    name: "Rerun Workflow",
    description: "Rerun a CircleCI workflow from the beginning or from failed jobs",
    category: "workflows",
    actionType: "write",
    inputSchema: rerunWorkflowSchema,
    retryable: false,
    timeout: 60000
};

export async function executeRerunWorkflow(
    client: CircleCIClient,
    params: RerunWorkflowParams
): Promise<OperationResult> {
    try {
        const result = await client.rerunWorkflow(params.workflowId, {
            from_failed: params.fromFailed,
            enable_ssh: params.enableSsh,
            jobs: params.jobs,
            sparse_tree: params.sparseTree
        });

        return {
            success: true,
            data: {
                originalWorkflowId: params.workflowId,
                newWorkflowId: result.workflow_id,
                message: `Workflow rerun triggered. New workflow ID: ${result.workflow_id}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to rerun workflow",
                retryable: false
            }
        };
    }
}
