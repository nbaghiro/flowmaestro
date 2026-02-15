import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Deactivate User operation schema
 */
export const deactivateUserSchema = z.object({
    userId: OktaUserIdSchema
});

export type DeactivateUserParams = z.infer<typeof deactivateUserSchema>;

/**
 * Deactivate User operation definition
 */
export const deactivateUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deactivateUser",
            name: "Deactivate User",
            description: "Deactivate a user in Okta (user can no longer sign in)",
            category: "users",
            inputSchema: deactivateUserSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create deactivateUserOperation");
        throw new Error(
            `Failed to create deactivateUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute deactivate user operation
 */
export async function executeDeactivateUser(
    client: OktaClient,
    params: DeactivateUserParams
): Promise<OperationResult> {
    try {
        await client.deactivateUser(params.userId);

        return {
            success: true,
            data: {
                userId: params.userId,
                deactivated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to deactivate user",
                retryable: false
            }
        };
    }
}
