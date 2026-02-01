import { assignIssueInputSchema, type AssignIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const assignIssueOperation: OperationDefinition = {
    id: "assignIssue",
    name: "Assign Issue",
    description: "Assign an issue to a user. Pass null as accountId to unassign the issue.",
    category: "issues",
    inputSchema: assignIssueInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeAssignIssue(
    client: JiraClient,
    params: AssignIssueInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody = {
            accountId: params.accountId
        };

        // Make API request
        await client.put(`/rest/api/3/issue/${params.issueIdOrKey}/assignee`, requestBody);

        return {
            success: true,
            data: {
                message: params.accountId
                    ? "Issue assigned successfully"
                    : "Issue unassigned successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to assign issue",
                retryable: true
            }
        };
    }
}
