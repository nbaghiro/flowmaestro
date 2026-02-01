import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubWorkflowIdSchema,
    GitHubBranchSchema,
    GitHubWorkflowInputsSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Trigger Workflow operation schema
 */
export const triggerWorkflowSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    workflow_id: GitHubWorkflowIdSchema,
    ref: GitHubBranchSchema.describe("Git reference (branch, tag, or SHA)"),
    inputs: GitHubWorkflowInputsSchema
});

export type TriggerWorkflowParams = z.infer<typeof triggerWorkflowSchema>;

/**
 * Trigger Workflow operation definition
 */
export const triggerWorkflowOperation: OperationDefinition = {
    id: "triggerWorkflow",
    name: "Trigger Workflow",
    description: "Trigger a workflow dispatch event",
    category: "workflows",
    inputSchema: triggerWorkflowSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute trigger workflow operation
 */
export async function executeTriggerWorkflow(
    client: GitHubClient,
    params: TriggerWorkflowParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            ref: params.ref
        };

        if (params.inputs) {
            body.inputs = params.inputs;
        }

        // This endpoint returns 204 No Content on success
        await client.post(
            `/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/dispatches`,
            body
        );

        return {
            success: true,
            data: {
                message: `Workflow ${params.workflow_id} triggered successfully on ${params.ref}`,
                workflow_id: params.workflow_id,
                ref: params.ref,
                triggered_at: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to trigger workflow",
                retryable: false
            }
        };
    }
}
