import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const createPullRequestSchema = z.object({
    project: z.string().describe("Project name or ID"),
    repositoryId: z.string().describe("Repository ID or name"),
    title: z.string().describe("Pull request title"),
    description: z.string().optional().describe("Pull request description"),
    sourceBranch: z.string().describe("Source branch name"),
    targetBranch: z.string().describe("Target branch name"),
    reviewers: z.array(z.string()).optional().describe("Reviewer IDs or emails")
});

export type CreatePullRequestParams = z.infer<typeof createPullRequestSchema>;

export const createPullRequestOperation: OperationDefinition = {
    id: "repositories_createPullRequest",
    name: "Create Pull Request",
    description: "Create a new pull request",
    category: "repositories",
    inputSchema: createPullRequestSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreatePullRequest(
    client: AzureDevOpsClient,
    params: CreatePullRequestParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            sourceRefName: `refs/heads/${params.sourceBranch}`,
            targetRefName: `refs/heads/${params.targetBranch}`,
            title: params.title,
            description: params.description || ""
        };

        if (params.reviewers && params.reviewers.length > 0) {
            requestBody.reviewers = params.reviewers.map((r) => ({ id: r }));
        }

        const response = await client.post<{
            pullRequestId: number;
            title: string;
            status: string;
            createdBy: { displayName: string };
            creationDate: string;
            url: string;
        }>(
            `/${params.project}/_apis/git/repositories/${params.repositoryId}/pullrequests`,
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
                message: error instanceof Error ? error.message : "Failed to create pull request",
                retryable: false
            }
        };
    }
}
