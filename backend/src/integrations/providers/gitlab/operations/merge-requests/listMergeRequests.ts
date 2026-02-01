import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabMergeRequest } from "../types";

/**
 * List Merge Requests operation schema
 */
export const listMergeRequestsSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    state: z
        .enum(["opened", "closed", "merged", "all"])
        .optional()
        .default("opened")
        .describe("Filter by merge request state"),
    scope: z
        .enum(["created_by_me", "assigned_to_me", "all"])
        .optional()
        .describe("Filter by scope"),
    author_id: z.number().int().optional().describe("Filter by author user ID"),
    assignee_id: z.number().int().optional().describe("Filter by assignee user ID"),
    reviewer_id: z.number().int().optional().describe("Filter by reviewer user ID"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone: z.string().optional().describe("Filter by milestone title"),
    source_branch: z.string().optional().describe("Filter by source branch name"),
    target_branch: z.string().optional().describe("Filter by target branch name"),
    search: z.string().optional().describe("Search in title and description"),
    order_by: z
        .enum(["created_at", "updated_at"])
        .optional()
        .default("created_at")
        .describe("Order merge requests by field"),
    sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort direction"),
    per_page: z.number().int().min(1).max(100).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListMergeRequestsParams = z.infer<typeof listMergeRequestsSchema>;

/**
 * List Merge Requests operation definition
 */
export const listMergeRequestsOperation: OperationDefinition = {
    id: "listMergeRequests",
    name: "List Merge Requests",
    description: "List merge requests in a GitLab project",
    category: "merge-requests",
    inputSchema: listMergeRequestsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list merge requests operation
 */
export async function executeListMergeRequests(
    client: GitLabClient,
    params: ListMergeRequestsParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, ...queryParams } = params;

        const mergeRequests = await client.get<GitLabMergeRequest[]>(
            `/projects/${projectId}/merge_requests`,
            queryParams
        );

        return {
            success: true,
            data: {
                merge_requests: mergeRequests.map((mr) => ({
                    id: mr.id,
                    iid: mr.iid,
                    title: mr.title,
                    description: mr.description,
                    state: mr.state,
                    source_branch: mr.source_branch,
                    target_branch: mr.target_branch,
                    author: mr.author
                        ? {
                              id: mr.author.id,
                              username: mr.author.username,
                              name: mr.author.name
                          }
                        : null,
                    assignees: mr.assignees.map((a) => ({
                        id: a.id,
                        username: a.username,
                        name: a.name
                    })),
                    reviewers: mr.reviewers.map((r) => ({
                        id: r.id,
                        username: r.username,
                        name: r.name
                    })),
                    labels: mr.labels,
                    draft: mr.draft,
                    merge_status: mr.merge_status,
                    has_conflicts: mr.has_conflicts,
                    created_at: mr.created_at,
                    updated_at: mr.updated_at,
                    merged_at: mr.merged_at,
                    web_url: mr.web_url,
                    user_notes_count: mr.user_notes_count
                })),
                count: mergeRequests.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list merge requests",
                retryable: true
            }
        };
    }
}
