import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabMergeRequest } from "../types";

/**
 * Merge Merge Request operation schema
 */
export const mergeMergeRequestSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    merge_request_iid: z.number().int().describe("Merge request IID (project-scoped ID)"),
    merge_commit_message: z.string().optional().describe("Custom merge commit message"),
    squash_commit_message: z.string().optional().describe("Custom squash commit message"),
    squash: z.boolean().optional().describe("Squash commits when merging"),
    should_remove_source_branch: z
        .boolean()
        .optional()
        .describe("Remove source branch after merging"),
    merge_when_pipeline_succeeds: z
        .boolean()
        .optional()
        .describe("Merge when pipeline succeeds (if pipeline is running)"),
    sha: z.string().optional().describe("Expected HEAD SHA of source branch (for safety)")
});

export type MergeMergeRequestParams = z.infer<typeof mergeMergeRequestSchema>;

/**
 * Merge Merge Request operation definition
 */
export const mergeMergeRequestOperation: OperationDefinition = {
    id: "mergeMergeRequest",
    name: "Merge Merge Request",
    description: "Accept and merge a merge request in a GitLab project",
    category: "merge-requests",
    actionType: "write",
    inputSchema: mergeMergeRequestSchema,
    retryable: false,
    timeout: 60000 // Merging can take longer
};

/**
 * Execute merge merge request operation
 */
export async function executeMergeMergeRequest(
    client: GitLabClient,
    params: MergeMergeRequestParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, merge_request_iid, ...mergeData } = params;

        const mr = await client.put<GitLabMergeRequest>(
            `/projects/${projectId}/merge_requests/${merge_request_iid}/merge`,
            mergeData
        );

        return {
            success: true,
            data: {
                id: mr.id,
                iid: mr.iid,
                title: mr.title,
                state: mr.state,
                merged: mr.state === "merged",
                merge_commit_sha: mr.merge_commit_sha,
                squash_commit_sha: mr.squash_commit_sha,
                merged_at: mr.merged_at,
                merged_by: mr.merged_by
                    ? {
                          id: mr.merged_by.id,
                          username: mr.merged_by.username,
                          name: mr.merged_by.name
                      }
                    : null,
                source_branch: mr.source_branch,
                target_branch: mr.target_branch,
                web_url: mr.web_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to merge merge request",
                retryable: false
            }
        };
    }
}
