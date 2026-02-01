import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubTitleSchema,
    GitHubBodySchema,
    GitHubLabelsSchema,
    GitHubAssigneesSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * Create Issue operation schema
 */
export const createIssueSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    title: GitHubTitleSchema,
    body: GitHubBodySchema,
    labels: GitHubLabelsSchema,
    assignees: GitHubAssigneesSchema,
    milestone: z.number().int().positive().optional().describe("Milestone number")
});

export type CreateIssueParams = z.infer<typeof createIssueSchema>;

/**
 * Create Issue operation definition
 */
export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description: "Create a new issue in a repository",
    category: "issues",
    inputSchema: createIssueSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create issue operation
 */
export async function executeCreateIssue(
    client: GitHubClient,
    params: CreateIssueParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            title: params.title
        };

        if (params.body) body.body = params.body;
        if (params.labels && params.labels.length > 0) body.labels = params.labels;
        if (params.assignees && params.assignees.length > 0) body.assignees = params.assignees;
        if (params.milestone) body.milestone = params.milestone;

        const issue = await client.post<GitHubIssue>(
            `/repos/${params.owner}/${params.repo}/issues`,
            body
        );

        return {
            success: true,
            data: {
                id: issue.id,
                number: issue.number,
                title: issue.title,
                body: issue.body,
                url: issue.html_url,
                state: issue.state,
                createdAt: issue.created_at
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
