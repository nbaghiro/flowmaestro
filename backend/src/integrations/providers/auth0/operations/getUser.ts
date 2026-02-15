import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User operation schema
 */
export const getUserSchema = z.object({
    userId: z.string().min(1).describe("The Auth0 user ID (e.g., auth0|123456)")
});

export type GetUserParams = z.infer<typeof getUserSchema>;

/**
 * Get User operation definition
 */
export const getUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUser",
            name: "Get User",
            description: "Get a user by their Auth0 user ID",
            category: "users",
            inputSchema: getUserSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create getUserOperation");
        throw new Error(
            `Failed to create getUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user operation
 */
export async function executeGetUser(
    client: Auth0Client,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const user = await client.getUser(params.userId);

        return {
            success: true,
            data: {
                userId: user.user_id,
                email: user.email,
                emailVerified: user.email_verified,
                name: user.name,
                nickname: user.nickname,
                picture: user.picture,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                blocked: user.blocked,
                appMetadata: user.app_metadata,
                userMetadata: user.user_metadata
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
