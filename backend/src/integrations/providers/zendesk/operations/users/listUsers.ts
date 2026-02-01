import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { UsersResponse } from "../../types";

/**
 * List Users Parameters
 */
export const listUsersSchema = z.object({
    role: z.enum(["end-user", "agent", "admin"]).optional().describe("Filter by user role"),
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)")
});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

/**
 * Operation Definition
 */
export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List all users in Zendesk with pagination",
    category: "users",
    inputSchema: listUsersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute List Users
 */
export async function executeListUsers(
    client: ZendeskClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.role) queryParams.role = params.role;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;

        const response = await client.get<UsersResponse>("/users.json", queryParams);

        return {
            success: true,
            data: {
                users: response.users,
                count: response.count,
                next_page: response.next_page,
                previous_page: response.previous_page
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
