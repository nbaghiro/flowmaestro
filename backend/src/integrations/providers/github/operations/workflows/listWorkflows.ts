import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubPerPageSchema,
    GitHubPageSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubWorkflowsList } from "../types";

/**
 * List Workflows operation schema
 */
export const listWorkflowsSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    per_page: GitHubPerPageSchema,
    page: GitHubPageSchema
});

export type ListWorkflowsParams = z.infer<typeof listWorkflowsSchema>;

/**
 * List Workflows operation definition
 */
export const listWorkflowsOperation: OperationDefinition = {
    id: "listWorkflows",
    name: "List Workflows",
    description: "List all workflows in a repository",
    category: "workflows",
    inputSchema: listWorkflowsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list workflows operation
 */
export async function executeListWorkflows(
    client: GitHubClient,
    params: ListWorkflowsParams
): Promise<OperationResult> {
    try {
        const response = await client.get<GitHubWorkflowsList>(
            `/repos/${params.owner}/${params.repo}/actions/workflows`,
            {
                per_page: params.per_page,
                page: params.page
            }
        );

        return {
            success: true,
            data: {
                workflows: response.workflows.map((workflow) => ({
                    id: workflow.id,
                    name: workflow.name,
                    path: workflow.path,
                    state: workflow.state,
                    html_url: workflow.html_url,
                    badge_url: workflow.badge_url,
                    created_at: workflow.created_at,
                    updated_at: workflow.updated_at
                })),
                total_count: response.total_count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workflows",
                retryable: true
            }
        };
    }
}
