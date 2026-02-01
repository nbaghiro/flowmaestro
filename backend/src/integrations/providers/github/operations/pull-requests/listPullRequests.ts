import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubStateSchema,
    GitHubSortSchema,
    GitHubDirectionSchema,
    GitHubPerPageSchema,
    GitHubPageSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubPullRequest } from "../types";

/**
 * List Pull Requests operation schema
 */
export const listPullRequestsSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    state: GitHubStateSchema,
    head: z.string().optional().describe("Filter by head branch (e.g., 'username:branch')"),
    base: z.string().optional().describe("Filter by base branch"),
    sort: GitHubSortSchema,
    direction: GitHubDirectionSchema,
    per_page: GitHubPerPageSchema,
    page: GitHubPageSchema
});

export type ListPullRequestsParams = z.infer<typeof listPullRequestsSchema>;

/**
 * List Pull Requests operation definition
 */
export const listPullRequestsOperation: OperationDefinition = {
    id: "listPullRequests",
    name: "List Pull Requests",
    description: "List pull requests in a repository",
    category: "pull_requests",
    inputSchema: listPullRequestsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list pull requests operation
 */
export async function executeListPullRequests(
    client: GitHubClient,
    params: ListPullRequestsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            state: params.state,
            sort: params.sort,
            direction: params.direction,
            per_page: params.per_page,
            page: params.page
        };

        if (params.head) queryParams.head = params.head;
        if (params.base) queryParams.base = params.base;

        const prs = await client.get<GitHubPullRequest[]>(
            `/repos/${params.owner}/${params.repo}/pulls`,
            queryParams
        );

        return {
            success: true,
            data: {
                pull_requests: prs.map((pr) => ({
                    id: pr.id,
                    number: pr.number,
                    title: pr.title,
                    body: pr.body,
                    state: pr.state,
                    html_url: pr.html_url,
                    user: {
                        login: pr.user.login,
                        html_url: pr.user.html_url
                    },
                    head: {
                        ref: pr.head.ref,
                        sha: pr.head.sha
                    },
                    base: {
                        ref: pr.base.ref,
                        sha: pr.base.sha
                    },
                    draft: pr.draft,
                    merged: pr.merged,
                    mergeable: pr.mergeable,
                    created_at: pr.created_at,
                    updated_at: pr.updated_at,
                    merged_at: pr.merged_at
                })),
                count: prs.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pull requests",
                retryable: true
            }
        };
    }
}
