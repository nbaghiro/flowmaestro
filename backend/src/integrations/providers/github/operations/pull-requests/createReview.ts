import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubIssueNumberSchema,
    GitHubReviewStateSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubReview } from "../types";

/**
 * Create Review operation schema
 */
export const createReviewSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    pull_number: GitHubIssueNumberSchema.describe("Pull request number"),
    body: z.string().optional().describe("Review body (markdown)"),
    event: GitHubReviewStateSchema,
    commit_id: z.string().optional().describe("SHA of the commit to review")
});

export type CreateReviewParams = z.infer<typeof createReviewSchema>;

/**
 * Create Review operation definition
 */
export const createReviewOperation: OperationDefinition = {
    id: "createReview",
    name: "Create Review",
    description: "Create a review on a pull request (approve, request changes, or comment)",
    category: "pull_requests",
    inputSchema: createReviewSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create review operation
 */
export async function executeCreateReview(
    client: GitHubClient,
    params: CreateReviewParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            event: params.event
        };

        if (params.body) body.body = params.body;
        if (params.commit_id) body.commit_id = params.commit_id;

        const review = await client.post<GitHubReview>(
            `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/reviews`,
            body
        );

        return {
            success: true,
            data: {
                id: review.id,
                state: review.state,
                body: review.body,
                html_url: review.html_url,
                user: {
                    login: review.user.login,
                    html_url: review.user.html_url
                },
                submitted_at: review.submitted_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create review",
                retryable: false
            }
        };
    }
}
