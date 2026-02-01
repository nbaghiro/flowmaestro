import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabIssue } from "../types";

/**
 * Update Issue operation schema
 */
export const updateIssueSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    issue_iid: z.number().int().describe("Issue IID (project-scoped ID)"),
    title: z.string().optional().describe("New issue title"),
    description: z.string().optional().describe("New issue description (supports Markdown)"),
    confidential: z.boolean().optional().describe("Make the issue confidential"),
    assignee_ids: z.array(z.number().int()).optional().describe("Array of assignee user IDs"),
    milestone_id: z.number().int().optional().describe("Milestone ID to assign"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    state_event: z.enum(["close", "reopen"]).optional().describe("Change issue state"),
    due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    weight: z.number().int().min(0).optional().describe("Issue weight (for issue boards)")
});

export type UpdateIssueParams = z.infer<typeof updateIssueSchema>;

/**
 * Update Issue operation definition
 */
export const updateIssueOperation: OperationDefinition = {
    id: "updateIssue",
    name: "Update Issue",
    description: "Update an existing issue in a GitLab project",
    category: "issues",
    actionType: "write",
    inputSchema: updateIssueSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update issue operation
 */
export async function executeUpdateIssue(
    client: GitLabClient,
    params: UpdateIssueParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, issue_iid, ...updateData } = params;

        const issue = await client.put<GitLabIssue>(
            `/projects/${projectId}/issues/${issue_iid}`,
            updateData
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
                          name: issue.author.name
                      }
                    : null,
                assignees: issue.assignees.map((a) => ({
                    id: a.id,
                    username: a.username,
                    name: a.name
                })),
                updated_at: issue.updated_at,
                closed_at: issue.closed_at,
                web_url: issue.web_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update issue",
                retryable: false
            }
        };
    }
}
