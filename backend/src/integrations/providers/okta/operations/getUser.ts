import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User operation schema
 */
export const getUserSchema = z.object({
    userId: OktaUserIdSchema
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
            description: "Get details of a specific user by ID",
            category: "users",
            inputSchema: getUserSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create getUserOperation");
        throw new Error(
            `Failed to create getUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user operation
 */
export async function executeGetUser(
    client: OktaClient,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const user = await client.getUser(params.userId);

        return {
            success: true,
            data: {
                id: user.id,
                status: user.status,
                login: user.profile.login,
                email: user.profile.email,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                displayName: user.profile.displayName,
                mobilePhone: user.profile.mobilePhone,
                created: user.created,
                activated: user.activated,
                lastLogin: user.lastLogin,
                lastUpdated: user.lastUpdated,
                statusChanged: user.statusChanged
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
