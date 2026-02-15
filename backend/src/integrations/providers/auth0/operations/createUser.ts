import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create User operation schema
 */
export const createUserSchema = z.object({
    email: z.string().email().describe("User's email address"),
    connection: z.string().min(1).describe("Name of the connection to create the user in"),
    password: z.string().min(8).optional().describe("User's password (required for database connections)"),
    emailVerified: z.boolean().optional().describe("Whether the email is verified"),
    name: z.string().optional().describe("User's full name"),
    nickname: z.string().optional().describe("User's nickname"),
    picture: z.string().url().optional().describe("URL to user's profile picture"),
    appMetadata: z.record(z.unknown()).optional().describe("Application-specific metadata"),
    userMetadata: z.record(z.unknown()).optional().describe("User-specific metadata")
});

export type CreateUserParams = z.infer<typeof createUserSchema>;

/**
 * Create User operation definition
 */
export const createUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createUser",
            name: "Create User",
            description: "Create a new user in Auth0",
            category: "users",
            inputSchema: createUserSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create createUserOperation");
        throw new Error(
            `Failed to create createUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create user operation
 */
export async function executeCreateUser(
    client: Auth0Client,
    params: CreateUserParams
): Promise<OperationResult> {
    try {
        const user = await client.createUser({
            email: params.email,
            connection: params.connection,
            password: params.password,
            email_verified: params.emailVerified,
            name: params.name,
            nickname: params.nickname,
            picture: params.picture,
            app_metadata: params.appMetadata,
            user_metadata: params.userMetadata
        });

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
                updatedAt: user.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create user",
                retryable: false
            }
        };
    }
}
