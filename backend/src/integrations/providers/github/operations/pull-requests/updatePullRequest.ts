import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubPullRequest } from "../types";

/**
 * Update Pull Request operation schema
 */
export const updatePullRequestSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    pull_number: GitHubIssueNumberSchema.describe("Pull request number"),
    title: z.string().min(1).max(256).optional().describe("New title"),
    body: z.string().optional().describe("New body (markdown)"),
    state: z.enum(["open", "closed"]).optional().describe("Update state"),
    base: z.string().optional().describe("New base branch")
});

export type UpdatePullRequestParams = z.infer<typeof updatePullRequestSchema>;

/**
 * Update Pull Request operation definition
 */
export const updatePullRequestOperation: OperationDefinition = {
    id: "updatePullRequest",
    name: "Update Pull Request",
    description: "Update an existing pull request",
    category: "pull_requests",
    inputSchema: updatePullRequestSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update pull request operation
 */
export async function executeUpdatePullRequest(
    client: GitHubClient,
    params: UpdatePullRequestParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};

        if (params.title !== undefined) body.title = params.title;
        if (params.body !== undefined) body.body = params.body;
        if (params.state !== undefined) body.state = params.state;
        if (params.base !== undefined) body.base = params.base;

        const pr = await client.patch<GitHubPullRequest>(
            `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`,
            body
        );

        return {
            success: true,
            data: {
                id: pr.id,
                number: pr.number,
                title: pr.title,
                body: pr.body,
                state: pr.state,
                html_url: pr.html_url,
                updated_at: pr.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update pull request",
                retryable: true
            }
        };
    }
}
