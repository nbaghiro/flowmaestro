import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomUser } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get User operation schema
 */
export const getUserSchema = z.object({});

export type GetUserParams = z.infer<typeof getUserSchema>;

/**
 * Get User operation definition
 */
export const getUserOperation: OperationDefinition = {
    id: "getUser",
    name: "Get User",
    description: "Retrieve the authenticated Zoom user's profile",
    category: "users",
    actionType: "read",
    inputSchema: getUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get user operation
 */
export async function executeGetUser(
    client: ZoomClient,
    _params: GetUserParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ZoomUser>("/users/me");

        return {
            success: true,
            data: {
                id: response.id,
                firstName: response.first_name,
                lastName: response.last_name,
                email: response.email,
                type: response.type,
                status: response.status,
                pmi: response.pmi,
                timezone: response.timezone,
                dept: response.dept,
                createdAt: response.created_at,
                lastLoginTime: response.last_login_time,
                picUrl: response.pic_url,
                language: response.language,
                accountId: response.account_id
            }
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
