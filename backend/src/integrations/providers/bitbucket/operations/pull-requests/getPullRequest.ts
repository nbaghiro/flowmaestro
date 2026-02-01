import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPullRequest } from "../types";

/**
 * Get Pull Request operation schema
 */
export const getPullRequestSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    pull_request_id: z.number().int().describe("Pull request ID")
});

export type GetPullRequestParams = z.infer<typeof getPullRequestSchema>;

/**
 * Get Pull Request operation definition
 */
export const getPullRequestOperation: OperationDefinition = {
    id: "getPullRequest",
    name: "Get Pull Request",
    description: "Get details of a specific pull request in a Bitbucket repository",
    category: "pull-requests",
    inputSchema: getPullRequestSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get pull request operation
 */
export async function executeGetPullRequest(
    client: BitbucketClient,
    params: GetPullRequestParams
): Promise<OperationResult> {
    try {
        const pr = await client.get<BitbucketPullRequest>(
            `/repositories/${params.workspace}/${params.repo_slug}/pullrequests/${params.pull_request_id}`
        );

        return {
            success: true,
            data: {
                id: pr.id,
                title: pr.title,
                description: pr.description,
                state: pr.state,
                source: {
                    branch: pr.source.branch.name,
                    commit: pr.source.commit?.hash
                },
                destination: {
                    branch: pr.destination.branch.name,
                    commit: pr.destination.commit?.hash
                },
                author: {
                    uuid: pr.author.uuid,
                    display_name: pr.author.display_name,
                    username: pr.author.username
                },
                created_on: pr.created_on,
                updated_on: pr.updated_on,
                close_source_branch: pr.close_source_branch,
                merge_commit: pr.merge_commit?.hash,
                closed_by: pr.closed_by
                    ? {
                          uuid: pr.closed_by.uuid,
                          display_name: pr.closed_by.display_name
                      }
                    : null,
                comment_count: pr.comment_count,
                task_count: pr.task_count,
                reviewers: pr.reviewers.map((r) => ({
                    uuid: r.uuid,
                    display_name: r.display_name,
                    username: r.username
                })),
                participants: pr.participants.map((p) => ({
                    user: {
                        uuid: p.user.uuid,
                        display_name: p.user.display_name
                    },
                    role: p.role,
                    approved: p.approved,
                    state: p.state
                })),
                html_url: pr.links.html?.href
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
