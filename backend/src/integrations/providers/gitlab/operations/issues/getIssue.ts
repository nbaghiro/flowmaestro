import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabIssue } from "../types";

/**
 * Get Issue operation schema
 */
export const getIssueSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    issue_iid: z.number().int().describe("Issue IID (project-scoped ID)")
});

export type GetIssueParams = z.infer<typeof getIssueSchema>;

/**
 * Get Issue operation definition
 */
export const getIssueOperation: OperationDefinition = {
    id: "getIssue",
    name: "Get Issue",
    description: "Get details of a specific issue in a GitLab project",
    category: "issues",
    inputSchema: getIssueSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get issue operation
 */
export async function executeGetIssue(
    client: GitLabClient,
    params: GetIssueParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const issue = await client.get<GitLabIssue>(
            `/projects/${projectId}/issues/${params.issue_iid}`
        );

        return {
            success: true,
            data: {
                id: issue.id,
                iid: issue.iid,
                project_id: issue.project_id,
                title: issue.title,
                description: issue.description,
                state: issue.state,
                labels: issue.labels,
                author: issue.author
                    ? {
                          id: issue.author.id,
                          username: issue.author.username,
                          name: issue.author.name,
                          avatar_url: issue.author.avatar_url
                      }
                    : null,
                assignees: issue.assignees.map((a) => ({
                    id: a.id,
                    username: a.username,
                    name: a.name,
                    avatar_url: a.avatar_url
                })),
                milestone: issue.milestone
                    ? {
                          id: issue.milestone.id,
                          iid: issue.milestone.iid,
                          title: issue.milestone.title,
                          state: issue.milestone.state,
                          due_date: issue.milestone.due_date
                      }
                    : null,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                closed_at: issue.closed_at,
                closed_by: issue.closed_by
                    ? {
                          id: issue.closed_by.id,
                          username: issue.closed_by.username,
                          name: issue.closed_by.name
                      }
                    : null,
                due_date: issue.due_date,
                confidential: issue.confidential,
                web_url: issue.web_url,
                upvotes: issue.upvotes,
                downvotes: issue.downvotes,
                user_notes_count: issue.user_notes_count,
                merge_requests_count: issue.merge_requests_count,
                time_stats: issue.time_stats,
                task_completion_status: issue.task_completion_status,
                weight: issue.weight,
                references: issue.references
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get issue",
                retryable: true
            }
        };
    }
}
