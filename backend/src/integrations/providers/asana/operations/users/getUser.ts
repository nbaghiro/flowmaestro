import { toJSONSchema } from "../../../../core/schema-utils";
import { getUserInputSchema, type GetUserInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getUserOperation: OperationDefinition = {
    id: "getUser",
    name: "Get User",
    description: "Retrieve a specific user from Asana by their GID.",
    category: "users",
    inputSchema: getUserInputSchema,
    inputSchemaJSON: toJSONSchema(getUserInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetUser(
    client: AsanaClient,
    params: GetUserInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>(
            `/users/${params.user_gid}`,
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user",
                retryable: true
            }
        };
    }
}
