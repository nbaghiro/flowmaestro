import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getPullRequestSchema = z.object({
    project: z.string().describe("Project name or ID"),
    repositoryId: z.string().describe("Repository ID or name"),
    pullRequestId: z.number().int().describe("Pull request ID")
});

export type GetPullRequestParams = z.infer<typeof getPullRequestSchema>;

export const getPullRequestOperation: OperationDefinition = {
    id: "repositories_getPullRequest",
    name: "Get Pull Request",
    description: "Get detailed information about a pull request",
    category: "repositories",
    inputSchema: getPullRequestSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPullRequest(
    client: AzureDevOpsClient,
    params: GetPullRequestParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            pullRequestId: number;
            title: string;
            description: string;
            status: string;
            createdBy: { displayName: string };
            creationDate: string;
            sourceRefName: string;
            targetRefName: string;
            reviewers: Array<{ displayName: string; vote: number }>;
            url: string;
        }>(
            `/${params.project}/_apis/git/repositories/${params.repositoryId}/pullrequests/${params.pullRequestId}`
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
                message: error instanceof Error ? error.message : "Failed to get pull request",
                retryable: true
            }
        };
    }
}
