import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubWorkflowRun } from "../types";

/**
 * Get Workflow Run operation schema
 */
export const getWorkflowRunSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    run_id: z.number().int().positive().describe("Workflow run ID")
});

export type GetWorkflowRunParams = z.infer<typeof getWorkflowRunSchema>;

/**
 * Get Workflow Run operation definition
 */
export const getWorkflowRunOperation: OperationDefinition = {
    id: "getWorkflowRun",
    name: "Get Workflow Run",
    description: "Get details about a specific workflow run",
    category: "workflows",
    inputSchema: getWorkflowRunSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get workflow run operation
 */
export async function executeGetWorkflowRun(
    client: GitHubClient,
    params: GetWorkflowRunParams
): Promise<OperationResult> {
    try {
        const run = await client.get<GitHubWorkflowRun>(
            `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}`
        );

        return {
            success: true,
            data: {
                id: run.id,
                name: run.name,
                run_number: run.run_number,
                event: run.event,
                status: run.status,
                conclusion: run.conclusion,
                workflow_id: run.workflow_id,
                head_branch: run.head_branch,
                head_sha: run.head_sha,
                url: run.url,
                html_url: run.html_url,
                created_at: run.created_at,
                updated_at: run.updated_at,
                run_started_at: run.run_started_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workflow run",
                retryable: true
            }
        };
    }
}
