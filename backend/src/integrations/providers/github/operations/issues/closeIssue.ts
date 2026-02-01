import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema, GitHubIssueNumberSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubIssue } from "../types";

/**
 * Close Issue operation schema
 */
export const closeIssueSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    issue_number: GitHubIssueNumberSchema,
    state_reason: z
        .enum(["completed", "not_planned"])
        .optional()
        .describe("Reason for closing (completed or not_planned)")
});

export type CloseIssueParams = z.infer<typeof closeIssueSchema>;

/**
 * Close Issue operation definition
 */
export const closeIssueOperation: OperationDefinition = {
    id: "closeIssue",
    name: "Close Issue",
    description: "Close an issue with an optional reason",
    category: "issues",
    inputSchema: closeIssueSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute close issue operation
 */
export async function executeCloseIssue(
    client: GitHubClient,
    params: CloseIssueParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            state: "closed"
        };

        if (params.state_reason) {
            body.state_reason = params.state_reason;
        }

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
                state: issue.state,
                state_reason: issue.state_reason,
                html_url: issue.html_url,
                closed_at: issue.closed_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to close issue",
                retryable: true
            }
        };
    }
}
