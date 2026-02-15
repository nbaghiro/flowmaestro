import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserProfileSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { OktaCreateUserProfile } from "../client/OktaClient";

const logger = getLogger();

/**
 * Create User operation schema
 */
export const createUserSchema = z.object({
    profile: OktaUserProfileSchema,
    password: z.string().min(8).optional().describe("Initial password for the user"),
    activate: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to activate the user immediately")
});

export type CreateUserParams = z.input<typeof createUserSchema>;

/**
 * Create User operation definition
 */
export const createUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createUser",
            name: "Create User",
            description: "Create a new user in Okta",
            category: "users",
            inputSchema: createUserSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create createUserOperation");
        throw new Error(
            `Failed to create createUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create user operation
 */
export async function executeCreateUser(
    client: OktaClient,
    params: CreateUserParams
): Promise<OperationResult> {
    try {
        const parsed = createUserSchema.parse(params);
        const credentials = parsed.password ? { password: { value: parsed.password } } : undefined;

        const user = await client.createUser({
            profile: parsed.profile as OktaCreateUserProfile,
            credentials,
            activate: parsed.activate
        });

        return {
            success: true,
            data: {
                id: user.id,
                status: user.status,
                login: user.profile.login,
                email: user.profile.email,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                created: user.created
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
