import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubComment } from "../types";

/**
 * Add Review Comment operation schema
 */
export const addReviewCommentSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    pull_number: GitHubIssueNumberSchema.describe("Pull request number"),
    body: z.string().min(1).describe("Comment body (markdown)"),
    commit_id: z.string().describe("SHA of the commit to comment on"),
    path: z.string().describe("Relative path of file to comment on"),
    line: z.number().int().positive().optional().describe("Line number in the diff to comment on"),
    side: z.enum(["LEFT", "RIGHT"]).optional().default("RIGHT").describe("Side of the diff")
});

export type AddReviewCommentParams = z.infer<typeof addReviewCommentSchema>;

/**
 * Add Review Comment operation definition
 */
export const addReviewCommentOperation: OperationDefinition = {
    id: "addReviewComment",
    name: "Add Review Comment",
    description: "Add an inline code review comment to a pull request",
    category: "pull_requests",
    inputSchema: addReviewCommentSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute add review comment operation
 */
export async function executeAddReviewComment(
    client: GitHubClient,
    params: AddReviewCommentParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            body: params.body,
            commit_id: params.commit_id,
            path: params.path,
            side: params.side
        };

        if (params.line !== undefined) {
            body.line = params.line;
        }

        const comment = await client.post<GitHubComment>(
            `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/comments`,
            body
        );

        return {
            success: true,
            data: {
                id: comment.id,
                body: comment.body,
                html_url: comment.html_url,
                user: {
                    login: comment.user.login,
                    html_url: comment.user.html_url
                },
                created_at: comment.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add review comment",
                retryable: false
            }
        };
    }
}
