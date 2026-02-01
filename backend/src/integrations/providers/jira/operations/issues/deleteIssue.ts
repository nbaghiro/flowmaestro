import { deleteIssueInputSchema, type DeleteIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const deleteIssueOperation: OperationDefinition = {
    id: "deleteIssue",
    name: "Delete Issue",
    description: "Delete an issue. Optionally delete subtasks as well.",
    category: "issues",
    inputSchema: deleteIssueInputSchema,
    retryable: false, // Deletion should not be retried
    timeout: 10000
};

export async function executeDeleteIssue(
    client: JiraClient,
    params: DeleteIssueInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.deleteSubtasks !== undefined) {
            queryParams.deleteSubtasks = params.deleteSubtasks ? "true" : "false";
        }

        // Make API request
        await client.delete(`/rest/api/3/issue/${params.issueIdOrKey}`);

        return {
            success: true,
            data: {
                message: "Issue deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete issue",
                retryable: false
            }
        };
    }
}
