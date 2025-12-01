import { toJSONSchema } from "../../../../core/schema-utils";
import { searchUsersInputSchema, type SearchUsersInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const searchUsersOperation: OperationDefinition = {
    id: "searchUsers",
    name: "Search Users",
    description: "Search for users by query or get a specific user by accountId.",
    category: "users",
    inputSchema: searchUsersInputSchema,
    inputSchemaJSON: toJSONSchema(searchUsersInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeSearchUsers(
    client: JiraClient,
    params: SearchUsersInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {
            startAt: params.startAt,
            maxResults: params.maxResults
        };

        if (params.query) {
            queryParams.query = params.query;
        }

        if (params.accountId) {
            queryParams.accountId = params.accountId;
        }

        // Make API request
        const users = await client.get<unknown[]>("/rest/api/3/user/search", queryParams);

        return {
            success: true,
            data: {
                users
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search users",
                retryable: true
            }
        };
    }
}
