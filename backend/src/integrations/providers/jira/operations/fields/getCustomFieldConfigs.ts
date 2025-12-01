import { toJSONSchema } from "../../../../core/schema-utils";
import { getCustomFieldConfigsInputSchema, type GetCustomFieldConfigsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getCustomFieldConfigsOperation: OperationDefinition = {
    id: "getCustomFieldConfigs",
    name: "Get Custom Field Configs",
    description:
        "Get configuration details for a custom field, including allowed values and default values.",
    category: "fields",
    inputSchema: getCustomFieldConfigsInputSchema,
    inputSchemaJSON: toJSONSchema(getCustomFieldConfigsInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetCustomFieldConfigs(
    client: JiraClient,
    params: GetCustomFieldConfigsInput
): Promise<OperationResult> {
    try {
        // Make API request
        const configs = await client.get<unknown>(`/rest/api/3/field/${params.fieldId}/context`);

        return {
            success: true,
            data: configs
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get custom field configs",
                retryable: true
            }
        };
    }
}
