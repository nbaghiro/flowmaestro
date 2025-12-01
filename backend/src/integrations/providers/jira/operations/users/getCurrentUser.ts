import { toJSONSchema } from "../../../../core/schema-utils";
import { getCurrentUserInputSchema, type GetCurrentUserInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getCurrentUserOperation: OperationDefinition = {
    id: "getCurrentUser",
    name: "Get Current User",
    description: "Get details of the currently authenticated user.",
    category: "users",
    inputSchema: getCurrentUserInputSchema,
    inputSchemaJSON: toJSONSchema(getCurrentUserInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetCurrentUser(
    client: JiraClient,
    params: GetCurrentUserInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.expand && params.expand.length > 0) {
            queryParams.expand = params.expand.join(",");
        }

        // Make API request
        const user = await client.get<unknown>("/rest/api/3/myself", queryParams);

        return {
            success: true,
            data: user
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current user",
                retryable: true
            }
        };
    }
}
