import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete User operation schema
 */
export const deleteUserSchema = z.object({
    userId: z.string().min(1).describe("The Auth0 user ID to delete")
});

export type DeleteUserParams = z.infer<typeof deleteUserSchema>;

/**
 * Delete User operation definition
 */
export const deleteUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteUser",
            name: "Delete User",
            description: "Delete a user from Auth0",
            category: "users",
            inputSchema: deleteUserSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create deleteUserOperation");
        throw new Error(
            `Failed to create deleteUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete user operation
 */
export async function executeDeleteUser(
    client: Auth0Client,
    params: DeleteUserParams
): Promise<OperationResult> {
    try {
        await client.deleteUser(params.userId);

        return {
            success: true,
            data: {
                deleted: true,
                userId: params.userId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete user",
                retryable: false
            }
        };
    }
}
