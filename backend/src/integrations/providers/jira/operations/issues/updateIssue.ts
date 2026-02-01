import { updateIssueInputSchema, type UpdateIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const updateIssueOperation: OperationDefinition = {
    id: "updateIssue",
    name: "Update Issue",
    description: "Update an existing issue's fields. Supports standard fields and custom fields.",
    category: "issues",
    inputSchema: updateIssueInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateIssue(
    client: JiraClient,
    params: UpdateIssueInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody: { fields: Record<string, unknown>; notifyUsers?: boolean } = {
            fields: params.fields
        };

        if (params.notifyUsers !== undefined) {
            requestBody.notifyUsers = params.notifyUsers;
        }

        // Make API request
        await client.put(`/rest/api/3/issue/${params.issueIdOrKey}`, requestBody);

        return {
            success: true,
            data: {
                message: "Issue updated successfully"
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
