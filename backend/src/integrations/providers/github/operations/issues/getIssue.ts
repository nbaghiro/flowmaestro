import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * Get Issue operation schema
 */
export const getIssueSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    issue_number: GitHubIssueNumberSchema
});

export type GetIssueParams = z.infer<typeof getIssueSchema>;

/**
 * Get Issue operation definition
 */
export const getIssueOperation: OperationDefinition = {
    id: "getIssue",
    name: "Get Issue",
    description: "Get details about a specific issue",
    category: "issues",
    inputSchema: getIssueSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get issue operation
 */
export async function executeGetIssue(
    client: GitHubClient,
    params: GetIssueParams
): Promise<OperationResult> {
    try {
        const issue = await client.get<GitHubIssue>(
            `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`
        );

        return {
            success: true,
            data: {
                id: issue.id,
                number: issue.number,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                html_url: issue.html_url,
                user: {
                    login: issue.user.login,
                    id: issue.user.id,
                    html_url: issue.user.html_url
                },
                labels: issue.labels.map((label) => ({
                    name: label.name,
                    color: label.color,
                    description: label.description
                })),
                assignees: issue.assignees.map((assignee) => ({
                    login: assignee.login,
                    html_url: assignee.html_url
                })),
                comments: issue.comments,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                closed_at: issue.closed_at
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
