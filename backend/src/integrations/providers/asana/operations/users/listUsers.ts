import { listUsersInputSchema, type ListUsersInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List all users in a workspace.",
    category: "users",
    inputSchema: listUsersInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListUsers(
    client: AsanaClient,
    params: ListUsersInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const users = await client.getPaginated<Record<string, unknown>>(
            `/workspaces/${params.workspace}/users`,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                users,
                count: users.length,
                workspace_gid: params.workspace
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list users",
                retryable: true
            }
        };
    }
}
