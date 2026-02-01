import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Cancel Workflow Run operation schema
 */
export const cancelWorkflowRunSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    run_id: z.number().int().positive().describe("Workflow run ID")
});

export type CancelWorkflowRunParams = z.infer<typeof cancelWorkflowRunSchema>;

/**
 * Cancel Workflow Run operation definition
 */
export const cancelWorkflowRunOperation: OperationDefinition = {
    id: "cancelWorkflowRun",
    name: "Cancel Workflow Run",
    description: "Cancel a workflow run that is in progress",
    category: "workflows",
    inputSchema: cancelWorkflowRunSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute cancel workflow run operation
 */
export async function executeCancelWorkflowRun(
    client: GitHubClient,
    params: CancelWorkflowRunParams
): Promise<OperationResult> {
    try {
        // This endpoint returns 202 Accepted on success
        await client.post(
            `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}/cancel`,
            {}
        );

        return {
            success: true,
            data: {
                message: `Workflow run ${params.run_id} cancelled successfully`,
                run_id: params.run_id,
                cancelled_at: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel workflow run",
                retryable: false
            }
        };
    }
}
