import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubIssueNumberSchema,
    GitHubLabelsSchema,
    GitHubAssigneesSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * Update Issue operation schema
 */
export const updateIssueSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    issue_number: GitHubIssueNumberSchema,
    title: z.string().min(1).max(256).optional().describe("New title"),
    body: z.string().optional().describe("New body (markdown)"),
    state: z.enum(["open", "closed"]).optional().describe("Update state"),
    labels: GitHubLabelsSchema,
    assignees: GitHubAssigneesSchema
});

export type UpdateIssueParams = z.infer<typeof updateIssueSchema>;

/**
 * Update Issue operation definition
 */
export const updateIssueOperation: OperationDefinition = {
    id: "updateIssue",
    name: "Update Issue",
    description: "Update an existing issue",
    category: "issues",
    inputSchema: updateIssueSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update issue operation
 */
export async function executeUpdateIssue(
    client: GitHubClient,
    params: UpdateIssueParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};

        if (params.title !== undefined) body.title = params.title;
        if (params.body !== undefined) body.body = params.body;
        if (params.state !== undefined) body.state = params.state;
        if (params.labels !== undefined) body.labels = params.labels;
        if (params.assignees !== undefined) body.assignees = params.assignees;

        const issue = await client.patch<GitHubIssue>(
            `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`,
            body
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
                updated_at: issue.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update issue",
                retryable: true
            }
        };
    }
}
