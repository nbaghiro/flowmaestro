import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const cancelWorkflowSchema = z.object({
    workflowId: z.string().min(1).describe("Workflow ID (UUID) to cancel")
});

export type CancelWorkflowParams = z.infer<typeof cancelWorkflowSchema>;

export const cancelWorkflowOperation: OperationDefinition = {
    id: "cancelWorkflow",
    name: "Cancel Workflow",
    description: "Cancel a running CircleCI workflow",
    category: "workflows",
    actionType: "write",
    inputSchema: cancelWorkflowSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCancelWorkflow(
    client: CircleCIClient,
    params: CancelWorkflowParams
): Promise<OperationResult> {
    try {
        const result = await client.cancelWorkflow(params.workflowId);

        return {
            success: true,
            data: {
                workflowId: params.workflowId,
                message: result.message || `Workflow ${params.workflowId} canceled successfully`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel workflow",
                retryable: false
            }
        };
    }
}
