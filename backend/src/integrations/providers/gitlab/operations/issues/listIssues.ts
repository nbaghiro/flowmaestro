import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabIssue } from "../types";

/**
 * List Issues operation schema
 */
export const listIssuesSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    state: z
        .enum(["opened", "closed", "all"])
        .optional()
        .default("opened")
        .describe("Filter by issue state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    assignee_id: z.number().int().optional().describe("Filter by assignee user ID"),
    author_id: z.number().int().optional().describe("Filter by author user ID"),
    milestone: z.string().optional().describe("Filter by milestone title"),
    search: z.string().optional().describe("Search in title and description"),
    order_by: z
        .enum([
            "created_at",
            "updated_at",
            "priority",
            "due_date",
            "relative_position",
            "label_priority",
            "milestone_due",
            "popularity",
            "weight"
        ])
        .optional()
        .default("created_at")
        .describe("Order issues by field"),
    sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort direction"),
    per_page: z.number().int().min(1).max(100).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListIssuesParams = z.infer<typeof listIssuesSchema>;

/**
 * List Issues operation definition
 */
export const listIssuesOperation: OperationDefinition = {
    id: "listIssues",
    name: "List Issues",
    description: "List issues in a GitLab project",
    category: "issues",
    inputSchema: listIssuesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list issues operation
 */
export async function executeListIssues(
    client: GitLabClient,
    params: ListIssuesParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, ...queryParams } = params;

        const issues = await client.get<GitLabIssue[]>(
            `/projects/${projectId}/issues`,
            queryParams
        );

        return {
            success: true,
            data: {
                issues: issues.map((issue) => ({
                    id: issue.id,
                    iid: issue.iid,
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
                    milestone: issue.milestone
                        ? {
                              id: issue.milestone.id,
                              title: issue.milestone.title
                          }
                        : null,
                    created_at: issue.created_at,
                    updated_at: issue.updated_at,
                    closed_at: issue.closed_at,
                    due_date: issue.due_date,
                    web_url: issue.web_url,
                    upvotes: issue.upvotes,
                    downvotes: issue.downvotes,
                    user_notes_count: issue.user_notes_count
                })),
                count: issues.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list issues",
                retryable: true
            }
        };
    }
}
