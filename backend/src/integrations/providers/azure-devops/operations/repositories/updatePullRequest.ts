import { z } from "zod";
import { PullRequestStatusSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const updatePullRequestSchema = z.object({
    project: z.string().describe("Project name or ID"),
    repositoryId: z.string().describe("Repository ID or name"),
    pullRequestId: z.number().int().describe("Pull request ID"),
    status: PullRequestStatusSchema.optional().describe("New status"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description")
});

export type UpdatePullRequestParams = z.infer<typeof updatePullRequestSchema>;

export const updatePullRequestOperation: OperationDefinition = {
    id: "repositories_updatePullRequest",
    name: "Update Pull Request",
    description: "Update pull request details or status",
    category: "repositories",
    inputSchema: updatePullRequestSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdatePullRequest(
    client: AzureDevOpsClient,
    params: UpdatePullRequestParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.status) requestBody.status = params.status;
        if (params.title) requestBody.title = params.title;
        if (params.description !== undefined) requestBody.description = params.description;

        const response = await client.patch<{
            pullRequestId: number;
            status: string;
            title: string;
        }>(
            `/${params.project}/_apis/git/repositories/${params.repositoryId}/pullrequests/${params.pullRequestId}`,
            requestBody
        );

        return {
            success: true,
            data: {
                ...response,
                repositoryId: params.repositoryId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update pull request",
                retryable: false
            }
        };
    }
}
