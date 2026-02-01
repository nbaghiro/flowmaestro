import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPullRequest, BitbucketPaginatedResponse } from "../types";

/**
 * List Pull Requests operation schema
 */
export const listPullRequestsSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    state: z
        .enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"])
        .optional()
        .default("OPEN")
        .describe("Filter by pull request state"),
    q: z.string().optional().describe("Query string to filter results"),
    sort: z
        .string()
        .optional()
        .describe("Field to sort by (e.g., '-created_on' for descending by creation date)"),
    pagelen: z.number().int().min(1).max(50).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListPullRequestsParams = z.infer<typeof listPullRequestsSchema>;

/**
 * List Pull Requests operation definition
 */
export const listPullRequestsOperation: OperationDefinition = {
    id: "listPullRequests",
    name: "List Pull Requests",
    description: "List pull requests in a Bitbucket repository",
    category: "pull-requests",
    inputSchema: listPullRequestsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list pull requests operation
 */
export async function executeListPullRequests(
    client: BitbucketClient,
    params: ListPullRequestsParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, ...queryParams } = params;

        const response = await client.get<BitbucketPaginatedResponse<BitbucketPullRequest>>(
            `/repositories/${workspace}/${repo_slug}/pullrequests`,
            queryParams
        );

        return {
            success: true,
            data: {
                pull_requests: response.values.map((pr) => ({
                    id: pr.id,
                    title: pr.title,
                    description: pr.description,
                    state: pr.state,
                    source_branch: pr.source.branch.name,
                    destination_branch: pr.destination.branch.name,
                    author: {
                        uuid: pr.author.uuid,
                        display_name: pr.author.display_name,
                        username: pr.author.username
                    },
                    created_on: pr.created_on,
                    updated_on: pr.updated_on,
                    close_source_branch: pr.close_source_branch,
                    comment_count: pr.comment_count,
                    task_count: pr.task_count,
                    reviewers: pr.reviewers.map((r) => ({
                        uuid: r.uuid,
                        display_name: r.display_name
                    })),
                    html_url: pr.links.html?.href
                })),
                count: response.values.length,
                has_more: !!response.next
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
