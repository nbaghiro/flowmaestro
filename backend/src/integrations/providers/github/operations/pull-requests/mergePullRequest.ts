import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubIssueNumberSchema,
    GitHubMergeMethodSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Merge Pull Request operation schema
 */
export const mergePullRequestSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    pull_number: GitHubIssueNumberSchema.describe("Pull request number"),
    commit_title: z.string().optional().describe("Custom merge commit title"),
    commit_message: z.string().optional().describe("Custom merge commit message"),
    merge_method: GitHubMergeMethodSchema,
    sha: z.string().optional().describe("SHA that pull request head must match")
});

export type MergePullRequestParams = z.infer<typeof mergePullRequestSchema>;

/**
 * Merge Pull Request operation definition
 */
export const mergePullRequestOperation: OperationDefinition = {
    id: "mergePullRequest",
    name: "Merge Pull Request",
    description: "Merge a pull request",
    category: "pull_requests",
    inputSchema: mergePullRequestSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute merge pull request operation
 */
export async function executeMergePullRequest(
    client: GitHubClient,
    params: MergePullRequestParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            merge_method: params.merge_method
        };

        if (params.commit_title) body.commit_title = params.commit_title;
        if (params.commit_message) body.commit_message = params.commit_message;
        if (params.sha) body.sha = params.sha;

        const response = await client.put<{ sha: string; merged: boolean; message: string }>(
            `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/merge`,
            body
        );

        return {
            success: true,
            data: {
                merged: response.merged,
                sha: response.sha,
                message: response.message
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to merge pull request",
                retryable: false
            }
        };
    }
}
