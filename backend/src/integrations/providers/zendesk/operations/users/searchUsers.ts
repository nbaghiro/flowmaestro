import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ZendeskSearchResult, ZendeskUser } from "../../types";

/**
 * Search Users Parameters
 */
export const searchUsersSchema = z.object({
    query: z
        .string()
        .describe(
            "Zendesk search query (e.g., 'email:john@example.com', 'role:agent', 'name:John')"
        ),
    page: z.number().optional().describe("Page number"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)")
});

export type SearchUsersParams = z.infer<typeof searchUsersSchema>;

/**
 * Operation Definition
 */
export const searchUsersOperation: OperationDefinition = {
    id: "searchUsers",
    name: "Search Users",
    description:
        "Search for users using Zendesk search syntax (e.g., email:john@example.com, role:agent)",
    category: "users",
    inputSchema: searchUsersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Search Users
 */
export async function executeSearchUsers(
    client: ZendeskClient,
    params: SearchUsersParams
): Promise<OperationResult> {
    try {
        // Build search query with type:user prefix
        const searchQuery = `type:user ${params.query}`;

        const queryParams: Record<string, unknown> = {
            query: searchQuery
        };

        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;

        const response = await client.get<ZendeskSearchResult<ZendeskUser>>(
            "/search.json",
            queryParams
        );

        return {
            success: true,
            data: {
                users: response.results,
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
                message: error instanceof Error ? error.message : "Failed to search users",
                retryable: true
            }
        };
    }
}
