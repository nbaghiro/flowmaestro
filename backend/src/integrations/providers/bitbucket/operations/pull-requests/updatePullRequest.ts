import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPullRequest } from "../types";

/**
 * Update Pull Request operation schema
 */
export const updatePullRequestSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    pull_request_id: z.number().int().describe("Pull request ID"),
    title: z.string().optional().describe("New pull request title"),
    description: z.string().optional().describe("New pull request description"),
    destination_branch: z.string().optional().describe("New destination branch name"),
    close_source_branch: z.boolean().optional().describe("Close source branch after merge"),
    reviewers: z
        .array(z.string())
        .optional()
        .describe("Array of reviewer UUIDs (with curly braces, e.g., '{uuid}')")
});

export type UpdatePullRequestParams = z.infer<typeof updatePullRequestSchema>;

/**
 * Update Pull Request operation definition
 */
export const updatePullRequestOperation: OperationDefinition = {
    id: "updatePullRequest",
    name: "Update Pull Request",
    description: "Update an existing pull request in a Bitbucket repository",
    category: "pull-requests",
    actionType: "write",
    inputSchema: updatePullRequestSchema,
    inputSchemaJSON: toJSONSchema(updatePullRequestSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute update pull request operation
 */
export async function executeUpdatePullRequest(
    client: BitbucketClient,
    params: UpdatePullRequestParams
): Promise<OperationResult> {
    try {
        const {
            workspace,
            repo_slug,
            pull_request_id,
            destination_branch,
            reviewers,
            ...updateData
        } = params;

        const requestBody: Record<string, unknown> = { ...updateData };

        // Update destination branch if specified
        if (destination_branch) {
            requestBody.destination = {
                branch: {
                    name: destination_branch
                }
            };
        }

        // Update reviewers if specified
        if (reviewers) {
            requestBody.reviewers = reviewers.map((uuid) => ({ uuid }));
        }

        const pr = await client.put<BitbucketPullRequest>(
            `/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}`,
            requestBody
        );

        return {
            success: true,
            data: {
                id: pr.id,
                title: pr.title,
                description: pr.description,
                state: pr.state,
                source_branch: pr.source.branch.name,
                destination_branch: pr.destination.branch.name,
                updated_on: pr.updated_on,
                html_url: pr.links.html?.href
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update pull request",
                retryable: false
            }
        };
    }
}
