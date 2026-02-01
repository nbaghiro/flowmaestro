import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { UserResponse } from "../../types";

/**
 * Get Current User Parameters (empty - no input needed)
 */
export const getCurrentUserSchema = z.object({});

export type GetCurrentUserParams = z.infer<typeof getCurrentUserSchema>;

/**
 * Operation Definition
 */
export const getCurrentUserOperation: OperationDefinition = {
    id: "getCurrentUser",
    name: "Get Current User",
    description: "Get the currently authenticated user in Zendesk",
    category: "users",
    inputSchema: getCurrentUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Current User
 */
export async function executeGetCurrentUser(
    client: ZendeskClient,
    _params: GetCurrentUserParams
): Promise<OperationResult> {
    try {
        const response = await client.get<UserResponse>("/users/me.json");

        return {
            success: true,
            data: response.user
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current user",
                retryable: false
            }
        };
    }
}
