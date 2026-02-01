import { getCurrentUserInputSchema, type GetCurrentUserInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getCurrentUserOperation: OperationDefinition = {
    id: "getCurrentUser",
    name: "Get Current User",
    description: "Get the currently authenticated Asana user.",
    category: "users",
    inputSchema: getCurrentUserInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCurrentUser(
    client: AsanaClient,
    params: GetCurrentUserInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>("/users/me", queryParams);

        return {
            success: true,
            data: response
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
