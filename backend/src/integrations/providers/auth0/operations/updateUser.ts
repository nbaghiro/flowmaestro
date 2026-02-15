import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update User operation schema
 */
export const updateUserSchema = z.object({
    userId: z.string().min(1).describe("The Auth0 user ID to update"),
    email: z.string().email().optional().describe("User's new email address"),
    emailVerified: z.boolean().optional().describe("Whether the email is verified"),
    name: z.string().optional().describe("User's full name"),
    nickname: z.string().optional().describe("User's nickname"),
    picture: z.string().url().optional().describe("URL to user's profile picture"),
    password: z.string().min(8).optional().describe("User's new password"),
    blocked: z.boolean().optional().describe("Whether the user is blocked"),
    appMetadata: z.record(z.unknown()).optional().describe("Application-specific metadata"),
    userMetadata: z.record(z.unknown()).optional().describe("User-specific metadata")
});

export type UpdateUserParams = z.infer<typeof updateUserSchema>;

/**
 * Update User operation definition
 */
export const updateUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateUser",
            name: "Update User",
            description: "Update an existing user in Auth0",
            category: "users",
            inputSchema: updateUserSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create updateUserOperation");
        throw new Error(
            `Failed to create updateUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update user operation
 */
export async function executeUpdateUser(
    client: Auth0Client,
    params: UpdateUserParams
): Promise<OperationResult> {
    try {
        const updateData: Record<string, unknown> = {};

        if (params.email !== undefined) updateData.email = params.email;
        if (params.emailVerified !== undefined) updateData.email_verified = params.emailVerified;
        if (params.name !== undefined) updateData.name = params.name;
        if (params.nickname !== undefined) updateData.nickname = params.nickname;
        if (params.picture !== undefined) updateData.picture = params.picture;
        if (params.password !== undefined) updateData.password = params.password;
        if (params.blocked !== undefined) updateData.blocked = params.blocked;
        if (params.appMetadata !== undefined) updateData.app_metadata = params.appMetadata;
        if (params.userMetadata !== undefined) updateData.user_metadata = params.userMetadata;

        const user = await client.updateUser(params.userId, updateData);

        return {
            success: true,
            data: {
                userId: user.user_id,
                email: user.email,
                emailVerified: user.email_verified,
                name: user.name,
                nickname: user.nickname,
                picture: user.picture,
                blocked: user.blocked,
                updatedAt: user.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update user",
                retryable: true
            }
        };
    }
}
