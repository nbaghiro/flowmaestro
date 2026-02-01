import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubComment } from "../types";

/**
 * Add Comment operation schema
 */
export const addCommentSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    issue_number: GitHubIssueNumberSchema,
    body: z.string().min(1).describe("Comment body (markdown)")
});

export type AddCommentParams = z.infer<typeof addCommentSchema>;

/**
 * Add Comment operation definition
 */
export const addCommentOperation: OperationDefinition = {
    id: "addComment",
    name: "Add Comment",
    description: "Add a comment to an issue or pull request",
    category: "issues",
    inputSchema: addCommentSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute add comment operation
 */
export async function executeAddComment(
    client: GitHubClient,
    params: AddCommentParams
): Promise<OperationResult> {
    try {
        const comment = await client.post<GitHubComment>(
            `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}/comments`,
            { body: params.body }
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
                message: error instanceof Error ? error.message : "Failed to add comment",
                retryable: false
            }
        };
    }
}
