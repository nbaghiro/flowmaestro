import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubStateSchema,
    GitHubSortSchema,
    GitHubDirectionSchema,
    GitHubPerPageSchema,
    GitHubPageSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * List Issues operation schema
 */
export const listIssuesSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    state: GitHubStateSchema,
    labels: z.string().optional().describe("Comma-separated list of label names"),
    assignee: z.string().optional().describe("Filter by assignee username"),
    creator: z.string().optional().describe("Filter by creator username"),
    sort: GitHubSortSchema,
    direction: GitHubDirectionSchema,
    per_page: GitHubPerPageSchema,
    page: GitHubPageSchema
});

export type ListIssuesParams = z.infer<typeof listIssuesSchema>;

/**
 * List Issues operation definition
 */
export const listIssuesOperation: OperationDefinition = {
    id: "listIssues",
    name: "List Issues",
    description: "List issues in a repository",
    category: "issues",
    inputSchema: listIssuesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list issues operation
 */
export async function executeListIssues(
    client: GitHubClient,
    params: ListIssuesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            state: params.state,
            sort: params.sort,
            direction: params.direction,
            per_page: params.per_page,
            page: params.page
        };

        if (params.labels) queryParams.labels = params.labels;
        if (params.assignee) queryParams.assignee = params.assignee;
        if (params.creator) queryParams.creator = params.creator;

        const issues = await client.get<GitHubIssue[]>(
            `/repos/${params.owner}/${params.repo}/issues`,
            queryParams
        );

        return {
            success: true,
            data: {
                issues: issues.map((issue) => ({
                    id: issue.id,
                    number: issue.number,
                    title: issue.title,
                    body: issue.body,
                    state: issue.state,
                    html_url: issue.html_url,
                    user: {
                        login: issue.user.login,
                        html_url: issue.user.html_url
                    },
                    labels: issue.labels.map((label) => label.name),
                    assignees: issue.assignees.map((assignee) => assignee.login),
                    comments: issue.comments,
                    created_at: issue.created_at,
                    updated_at: issue.updated_at,
                    closed_at: issue.closed_at
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
