import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabMergeRequest } from "../types";

/**
 * Create Merge Request operation schema
 */
export const createMergeRequestSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    source_branch: z.string().min(1).describe("Source branch name"),
    target_branch: z.string().min(1).describe("Target branch name"),
    title: z.string().min(1).describe("Merge request title"),
    description: z.string().optional().describe("Merge request description (supports Markdown)"),
    assignee_ids: z.array(z.number().int()).optional().describe("Array of assignee user IDs"),
    reviewer_ids: z.array(z.number().int()).optional().describe("Array of reviewer user IDs"),
    milestone_id: z.number().int().optional().describe("Milestone ID to assign"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    squash: z.boolean().optional().describe("Squash commits when merging"),
    remove_source_branch: z.boolean().optional().describe("Remove source branch after merging"),
    draft: z.boolean().optional().default(false).describe("Create as draft merge request")
});

export type CreateMergeRequestParams = z.infer<typeof createMergeRequestSchema>;

/**
 * Create Merge Request operation definition
 */
export const createMergeRequestOperation: OperationDefinition = {
    id: "createMergeRequest",
    name: "Create Merge Request",
    description: "Create a new merge request in a GitLab project",
    category: "merge-requests",
    actionType: "write",
    inputSchema: createMergeRequestSchema,
    inputSchemaJSON: toJSONSchema(createMergeRequestSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute create merge request operation
 */
export async function executeCreateMergeRequest(
    client: GitLabClient,
    params: CreateMergeRequestParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, draft, ...mrData } = params;

        // Handle draft by prepending "Draft: " to title if draft is true
        const requestData = {
            ...mrData,
            title: draft ? `Draft: ${mrData.title}` : mrData.title
        };

        const mr = await client.post<GitLabMergeRequest>(
            `/projects/${projectId}/merge_requests`,
            requestData
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
                draft: mr.draft,
                created_at: mr.created_at,
                web_url: mr.web_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create merge request",
                retryable: false
            }
        };
    }
}
