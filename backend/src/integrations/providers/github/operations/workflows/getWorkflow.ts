import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubWorkflowIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubWorkflow } from "../types";

/**
 * Get Workflow operation schema
 */
export const getWorkflowSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    workflow_id: GitHubWorkflowIdSchema
});

export type GetWorkflowParams = z.infer<typeof getWorkflowSchema>;

/**
 * Get Workflow operation definition
 */
export const getWorkflowOperation: OperationDefinition = {
    id: "getWorkflow",
    name: "Get Workflow",
    description: "Get details about a specific workflow",
    category: "workflows",
    inputSchema: getWorkflowSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get workflow operation
 */
export async function executeGetWorkflow(
    client: GitHubClient,
    params: GetWorkflowParams
): Promise<OperationResult> {
    try {
        const workflow = await client.get<GitHubWorkflow>(
            `/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}`
        );

        return {
            success: true,
            data: {
                id: workflow.id,
                name: workflow.name,
                path: workflow.path,
                state: workflow.state,
                url: workflow.url,
                html_url: workflow.html_url,
                badge_url: workflow.badge_url,
                created_at: workflow.created_at,
                updated_at: workflow.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workflow",
                retryable: true
            }
        };
    }
}
