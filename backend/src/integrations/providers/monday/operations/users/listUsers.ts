import { toJSONSchema } from "../../../../core/schema-utils";
import { LIST_USERS } from "../../graphql/queries";
import { listUsersInputSchema, type ListUsersInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List all users in the Monday.com account.",
    category: "users",
    inputSchema: listUsersInputSchema,
    inputSchemaJSON: toJSONSchema(listUsersInputSchema),
    retryable: true,
    timeout: 15000
};

interface ListUsersResponse {
    users: Array<{
        id: string;
        name: string;
        email: string;
        photo_thumb: string | null;
        title: string | null;
        enabled: boolean;
        is_admin: boolean;
        is_guest: boolean;
        created_at: string;
    }>;
}

export async function executeListUsers(
    client: MondayClient,
    params: ListUsersInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListUsersResponse>(LIST_USERS, {
            kind: params.kind,
            limit: params.limit,
            page: params.page
        });

        const users = response.users || [];

        return {
            success: true,
            data: {
                users,
                count: users.length
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
