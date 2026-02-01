import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * Reopen Issue operation schema
 */
export const reopenIssueSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    issue_number: GitHubIssueNumberSchema
});

export type ReopenIssueParams = z.infer<typeof reopenIssueSchema>;

/**
 * Reopen Issue operation definition
 */
export const reopenIssueOperation: OperationDefinition = {
    id: "reopenIssue",
    name: "Reopen Issue",
    description: "Reopen a closed issue",
    category: "issues",
    inputSchema: reopenIssueSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute reopen issue operation
 */
export async function executeReopenIssue(
    client: GitHubClient,
    params: ReopenIssueParams
): Promise<OperationResult> {
    try {
        const issue = await client.patch<GitHubIssue>(
            `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`,
            { state: "open" }
        );

        return {
            success: true,
            data: {
                id: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                state_reason: issue.state_reason,
                html_url: issue.html_url,
                updated_at: issue.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reopen issue",
                retryable: true
            }
        };
    }
}
