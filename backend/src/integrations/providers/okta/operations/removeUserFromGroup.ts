import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserIdSchema, OktaGroupIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Remove User from Group operation schema
 */
export const removeUserFromGroupSchema = z.object({
    groupId: OktaGroupIdSchema,
    userId: OktaUserIdSchema
});

export type RemoveUserFromGroupParams = z.infer<typeof removeUserFromGroupSchema>;

/**
 * Remove User from Group operation definition
 */
export const removeUserFromGroupOperation: OperationDefinition = (() => {
    try {
        return {
            id: "removeUserFromGroup",
            name: "Remove User from Group",
            description: "Remove a user from a group in Okta",
            category: "groups",
            inputSchema: removeUserFromGroupSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Okta", err: error },
            "Failed to create removeUserFromGroupOperation"
        );
        throw new Error(
            `Failed to create removeUserFromGroup operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute remove user from group operation
 */
export async function executeRemoveUserFromGroup(
    client: OktaClient,
    params: RemoveUserFromGroupParams
): Promise<OperationResult> {
    try {
        await client.removeUserFromGroup(params.groupId, params.userId);

        return {
            success: true,
            data: {
                groupId: params.groupId,
                userId: params.userId,
                removed: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove user from group",
                retryable: false
            }
        };
    }
}
