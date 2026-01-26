import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabMergeRequest } from "../types";

/**
 * Get Merge Request operation schema
 */
export const getMergeRequestSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    merge_request_iid: z.number().int().describe("Merge request IID (project-scoped ID)")
});

export type GetMergeRequestParams = z.infer<typeof getMergeRequestSchema>;

/**
 * Get Merge Request operation definition
 */
export const getMergeRequestOperation: OperationDefinition = {
    id: "getMergeRequest",
    name: "Get Merge Request",
    description: "Get details of a specific merge request in a GitLab project",
    category: "merge-requests",
    inputSchema: getMergeRequestSchema,
    inputSchemaJSON: toJSONSchema(getMergeRequestSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute get merge request operation
 */
export async function executeGetMergeRequest(
    client: GitLabClient,
    params: GetMergeRequestParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const mr = await client.get<GitLabMergeRequest>(
            `/projects/${projectId}/merge_requests/${params.merge_request_iid}`
        );

        return {
            success: true,
            data: {
                id: mr.id,
                iid: mr.iid,
                project_id: mr.project_id,
                title: mr.title,
                description: mr.description,
                state: mr.state,
                source_branch: mr.source_branch,
                target_branch: mr.target_branch,
                source_project_id: mr.source_project_id,
                target_project_id: mr.target_project_id,
                author: mr.author
                    ? {
                          id: mr.author.id,
                          username: mr.author.username,
                          name: mr.author.name,
                          avatar_url: mr.author.avatar_url
                      }
                    : null,
                assignees: mr.assignees.map((a) => ({
                    id: a.id,
                    username: a.username,
                    name: a.name,
                    avatar_url: a.avatar_url
                })),
                reviewers: mr.reviewers.map((r) => ({
                    id: r.id,
                    username: r.username,
                    name: r.name,
                    avatar_url: r.avatar_url
                })),
                labels: mr.labels,
                milestone: mr.milestone
                    ? {
                          id: mr.milestone.id,
                          iid: mr.milestone.iid,
                          title: mr.milestone.title,
                          state: mr.milestone.state
                      }
                    : null,
                draft: mr.draft,
                merge_status: mr.merge_status,
                has_conflicts: mr.has_conflicts,
                blocking_discussions_resolved: mr.blocking_discussions_resolved,
                mergeable: mr.merge_status === "can_be_merged",
                sha: mr.sha,
                merge_commit_sha: mr.merge_commit_sha,
                squash_commit_sha: mr.squash_commit_sha,
                squash: mr.squash,
                created_at: mr.created_at,
                updated_at: mr.updated_at,
                merged_at: mr.merged_at,
                merged_by: mr.merged_by
                    ? {
                          id: mr.merged_by.id,
                          username: mr.merged_by.username,
                          name: mr.merged_by.name
                      }
                    : null,
                closed_at: mr.closed_at,
                closed_by: mr.closed_by
                    ? {
                          id: mr.closed_by.id,
                          username: mr.closed_by.username,
                          name: mr.closed_by.name
                      }
                    : null,
                web_url: mr.web_url,
                user_notes_count: mr.user_notes_count,
                upvotes: mr.upvotes,
                downvotes: mr.downvotes,
                time_stats: mr.time_stats,
                task_completion_status: mr.task_completion_status,
                references: mr.references
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get merge request",
                retryable: true
            }
        };
    }
}
