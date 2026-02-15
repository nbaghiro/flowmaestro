import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User Roles operation schema
 */
export const getUserRolesSchema = z.object({
    userId: z.string().min(1).describe("The Auth0 user ID to get roles for")
});

export type GetUserRolesParams = z.infer<typeof getUserRolesSchema>;

/**
 * Get User Roles operation definition
 */
export const getUserRolesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUserRoles",
            name: "Get User Roles",
            description: "Get all roles assigned to a user in Auth0",
            category: "roles",
            inputSchema: getUserRolesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create getUserRolesOperation");
        throw new Error(
            `Failed to create getUserRoles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user roles operation
 */
export async function executeGetUserRoles(
    client: Auth0Client,
    params: GetUserRolesParams
): Promise<OperationResult> {
    try {
        const roles = await client.getUserRoles(params.userId);

        return {
            success: true,
            data: {
                userId: params.userId,
                roles: roles.map((role) => ({
                    id: role.id,
                    name: role.name,
                    description: role.description
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user roles",
                retryable: true
            }
        };
    }
}
