import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubTitleSchema,
    GitHubBodySchema,
    GitHubBranchSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubPullRequest } from "../types";

/**
 * Create Pull Request operation schema
 */
export const createPullRequestSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    title: GitHubTitleSchema,
    head: GitHubBranchSchema.describe("The name of the branch where your changes are"),
    base: GitHubBranchSchema.describe("The name of the branch you want to merge into"),
    body: GitHubBodySchema,
    draft: z.boolean().optional().default(false).describe("Create as draft PR"),
    maintainer_can_modify: z
        .boolean()
        .optional()
        .default(true)
        .describe("Allow maintainers to modify the PR")
});

export type CreatePullRequestParams = z.infer<typeof createPullRequestSchema>;

/**
 * Create Pull Request operation definition
 */
export const createPullRequestOperation: OperationDefinition = {
    id: "createPullRequest",
    name: "Create Pull Request",
    description: "Create a new pull request",
    category: "pull_requests",
    inputSchema: createPullRequestSchema,
    retryable: false,
    timeout: 20000
};

/**
 * Execute create pull request operation
 */
export async function executeCreatePullRequest(
    client: GitHubClient,
    params: CreatePullRequestParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            title: params.title,
            head: params.head,
            base: params.base,
            draft: params.draft,
            maintainer_can_modify: params.maintainer_can_modify
        };

        if (params.body) {
            body.body = params.body;
        }

        const pr = await client.post<GitHubPullRequest>(
            `/repos/${params.owner}/${params.repo}/pulls`,
            body
        );

        return {
            success: true,
            data: {
                id: pr.id,
                number: pr.number,
                title: pr.title,
                html_url: pr.html_url,
                state: pr.state,
                draft: pr.draft,
                head: {
                    ref: pr.head.ref,
                    sha: pr.head.sha
                },
                base: {
                    ref: pr.base.ref,
                    sha: pr.base.sha
                },
                created_at: pr.created_at
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
