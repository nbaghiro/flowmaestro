import { listFieldsInputSchema, type ListFieldsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const listFieldsOperation: OperationDefinition = {
    id: "listFields",
    name: "List Fields",
    description: "Get all fields in Jira, including custom fields. Results are cached for 1 hour.",
    category: "fields",
    inputSchema: listFieldsInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListFields(
    client: JiraClient,
    _params: ListFieldsInput
): Promise<OperationResult> {
    try {
        // Make API request
        const fields = await client.get<unknown[]>("/rest/api/3/field");

        return {
            success: true,
            data: {
                fields
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list fields",
                retryable: true
            }
        };
    }
}
