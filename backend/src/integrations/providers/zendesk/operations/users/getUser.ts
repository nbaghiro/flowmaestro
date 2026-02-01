import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { UserResponse } from "../../types";

/**
 * Get User Parameters
 */
export const getUserSchema = z.object({
    user_id: z.number().describe("The ID of the user to retrieve")
});

export type GetUserParams = z.infer<typeof getUserSchema>;

/**
 * Operation Definition
 */
export const getUserOperation: OperationDefinition = {
    id: "getUser",
    name: "Get User",
    description: "Get a user by ID from Zendesk",
    category: "users",
    inputSchema: getUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get User
 */
export async function executeGetUser(
    client: ZendeskClient,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const response = await client.get<UserResponse>(`/users/${params.user_id}.json`);

        return {
            success: true,
            data: response.user
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user",
                retryable: false
            }
        };
    }
}
