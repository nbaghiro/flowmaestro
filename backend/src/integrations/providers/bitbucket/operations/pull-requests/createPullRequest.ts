import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPullRequest } from "../types";

/**
 * Create Pull Request operation schema
 */
export const createPullRequestSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    title: z.string().min(1).describe("Pull request title"),
    source_branch: z.string().min(1).describe("Source branch name"),
    destination_branch: z.string().min(1).describe("Destination branch name"),
    description: z.string().optional().describe("Pull request description (supports Markdown)"),
    close_source_branch: z
        .boolean()
        .optional()
        .default(false)
        .describe("Close source branch after merge"),
    reviewers: z
        .array(z.string())
        .optional()
        .describe("Array of reviewer UUIDs (with curly braces, e.g., '{uuid}')")
});

export type CreatePullRequestParams = z.infer<typeof createPullRequestSchema>;

/**
 * Create Pull Request operation definition
 */
export const createPullRequestOperation: OperationDefinition = {
    id: "createPullRequest",
    name: "Create Pull Request",
    description: "Create a new pull request in a Bitbucket repository",
    category: "pull-requests",
    actionType: "write",
    inputSchema: createPullRequestSchema,
    inputSchemaJSON: toJSONSchema(createPullRequestSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute create pull request operation
 */
export async function executeCreatePullRequest(
    client: BitbucketClient,
    params: CreatePullRequestParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, source_branch, destination_branch, reviewers, ...prData } =
            params;

        const requestBody: Record<string, unknown> = {
            ...prData,
            source: {
                branch: {
                    name: source_branch
                }
            },
            destination: {
                branch: {
                    name: destination_branch
                }
            }
        };

        // Add reviewers if specified
        if (reviewers && reviewers.length > 0) {
            requestBody.reviewers = reviewers.map((uuid) => ({ uuid }));
        }

        const pr = await client.post<BitbucketPullRequest>(
            `/repositories/${workspace}/${repo_slug}/pullrequests`,
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
                author: {
                    uuid: pr.author.uuid,
                    display_name: pr.author.display_name
                },
                created_on: pr.created_on,
                html_url: pr.links.html?.href
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
