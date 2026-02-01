import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubPullRequest } from "../types";

/**
 * Get Pull Request operation schema
 */
export const getPullRequestSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    pull_number: GitHubIssueNumberSchema.describe("Pull request number")
});

export type GetPullRequestParams = z.infer<typeof getPullRequestSchema>;

/**
 * Get Pull Request operation definition
 */
export const getPullRequestOperation: OperationDefinition = {
    id: "getPullRequest",
    name: "Get Pull Request",
    description: "Get details about a specific pull request",
    category: "pull_requests",
    inputSchema: getPullRequestSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get pull request operation
 */
export async function executeGetPullRequest(
    client: GitHubClient,
    params: GetPullRequestParams
): Promise<OperationResult> {
    try {
        const pr = await client.get<GitHubPullRequest>(
            `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`
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
                diff_url: pr.diff_url,
                patch_url: pr.patch_url,
                user: {
                    login: pr.user.login,
                    id: pr.user.id,
                    html_url: pr.user.html_url
                },
                head: {
                    ref: pr.head.ref,
                    sha: pr.head.sha,
                    label: pr.head.label
                },
                base: {
                    ref: pr.base.ref,
                    sha: pr.base.sha,
                    label: pr.base.label
                },
                draft: pr.draft,
                merged: pr.merged,
                mergeable: pr.mergeable,
                mergeable_state: pr.mergeable_state,
                merge_commit_sha: pr.merge_commit_sha,
                assignees: pr.assignees.map((a) => a.login),
                requested_reviewers: pr.requested_reviewers.map((r) => r.login),
                labels: pr.labels.map((l) => l.name),
                comments: pr.comments,
                review_comments: pr.review_comments,
                commits: pr.commits,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                closed_at: pr.closed_at,
                merged_at: pr.merged_at
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
