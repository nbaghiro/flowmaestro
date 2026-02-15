import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Assign Roles operation schema
 */
export const assignRolesSchema = z.object({
    userId: z.string().min(1).describe("The Auth0 user ID to assign roles to"),
    roleIds: z.array(z.string().min(1)).min(1).describe("Array of role IDs to assign")
});

export type AssignRolesParams = z.infer<typeof assignRolesSchema>;

/**
 * Assign Roles operation definition
 */
export const assignRolesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "assignRoles",
            name: "Assign Roles",
            description: "Assign roles to a user in Auth0",
            category: "roles",
            inputSchema: assignRolesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create assignRolesOperation");
        throw new Error(
            `Failed to create assignRoles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute assign roles operation
 */
export async function executeAssignRoles(
    client: Auth0Client,
    params: AssignRolesParams
): Promise<OperationResult> {
    try {
        await client.assignRoles(params.userId, params.roleIds);

        return {
            success: true,
            data: {
                userId: params.userId,
                assignedRoleIds: params.roleIds
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to assign roles",
                retryable: true
            }
        };
    }
}
