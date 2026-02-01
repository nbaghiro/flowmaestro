import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubWorkflowIdSchema,
    GitHubWorkflowStatusSchema,
    GitHubWorkflowConclusionSchema,
    GitHubBranchSchema,
    GitHubPerPageSchema,
    GitHubPageSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubWorkflowRunsList } from "../types";

/**
 * List Workflow Runs operation schema
 */
export const listWorkflowRunsSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    workflow_id: GitHubWorkflowIdSchema.optional().describe("Filter by specific workflow"),
    branch: GitHubBranchSchema.optional().describe("Filter by branch"),
    status: GitHubWorkflowStatusSchema,
    conclusion: GitHubWorkflowConclusionSchema,
    per_page: GitHubPerPageSchema,
    page: GitHubPageSchema
});

export type ListWorkflowRunsParams = z.infer<typeof listWorkflowRunsSchema>;

/**
 * List Workflow Runs operation definition
 */
export const listWorkflowRunsOperation: OperationDefinition = {
    id: "listWorkflowRuns",
    name: "List Workflow Runs",
    description: "List workflow runs for a repository or specific workflow",
    category: "workflows",
    inputSchema: listWorkflowRunsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list workflow runs operation
 */
export async function executeListWorkflowRuns(
    client: GitHubClient,
    params: ListWorkflowRunsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            per_page: params.per_page,
            page: params.page
        };

        if (params.branch) queryParams.branch = params.branch;
        if (params.status) queryParams.status = params.status;
        if (params.conclusion) queryParams.conclusion = params.conclusion;

        // Determine endpoint based on whether workflow_id is provided
        const endpoint = params.workflow_id
            ? `/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/runs`
            : `/repos/${params.owner}/${params.repo}/actions/runs`;

        const response = await client.get<GitHubWorkflowRunsList>(endpoint, queryParams);

        return {
            success: true,
            data: {
                workflow_runs: response.workflow_runs.map((run) => ({
                    id: run.id,
                    name: run.name,
                    run_number: run.run_number,
                    event: run.event,
                    status: run.status,
                    conclusion: run.conclusion,
                    workflow_id: run.workflow_id,
                    head_branch: run.head_branch,
                    head_sha: run.head_sha,
                    html_url: run.html_url,
                    created_at: run.created_at,
                    updated_at: run.updated_at,
                    run_started_at: run.run_started_at
                })),
                total_count: response.total_count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workflow runs",
                retryable: true
            }
        };
    }
}
