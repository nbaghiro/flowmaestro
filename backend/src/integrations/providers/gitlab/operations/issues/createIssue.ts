import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabIssue } from "../types";

/**
 * Create Issue operation schema
 */
export const createIssueSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    title: z.string().min(1).describe("Issue title"),
    description: z.string().optional().describe("Issue description (supports Markdown)"),
    confidential: z.boolean().optional().default(false).describe("Make the issue confidential"),
    assignee_ids: z.array(z.number().int()).optional().describe("Array of assignee user IDs"),
    milestone_id: z.number().int().optional().describe("Milestone ID to assign"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    weight: z.number().int().min(0).optional().describe("Issue weight (for issue boards)")
});

export type CreateIssueParams = z.infer<typeof createIssueSchema>;

/**
 * Create Issue operation definition
 */
export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description: "Create a new issue in a GitLab project",
    category: "issues",
    actionType: "write",
    inputSchema: createIssueSchema,
    inputSchemaJSON: toJSONSchema(createIssueSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute create issue operation
 */
export async function executeCreateIssue(
    client: GitLabClient,
    params: CreateIssueParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, ...issueData } = params;

        const issue = await client.post<GitLabIssue>(`/projects/${projectId}/issues`, issueData);

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
                created_at: issue.created_at,
                web_url: issue.web_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create issue",
                retryable: false
            }
        };
    }
}
