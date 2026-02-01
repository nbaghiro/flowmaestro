import { getIssueTypesInputSchema, type GetIssueTypesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getIssueTypesOperation: OperationDefinition = {
    id: "getIssueTypes",
    name: "Get Issue Types",
    description: "Get all issue types available for a specific project.",
    category: "projects",
    inputSchema: getIssueTypesInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetIssueTypes(
    client: JiraClient,
    params: GetIssueTypesInput
): Promise<OperationResult> {
    try {
        // Make API request
        const issueTypes = await client.get<unknown[]>(
            `/rest/api/3/project/${params.projectId}/statuses`
        );

        return {
            success: true,
            data: {
                issueTypes
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get issue types",
                retryable: true
            }
        };
    }
}
