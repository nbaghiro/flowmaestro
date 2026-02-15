import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserIdSchema, OktaGroupIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Add User to Group operation schema
 */
export const addUserToGroupSchema = z.object({
    groupId: OktaGroupIdSchema,
    userId: OktaUserIdSchema
});

export type AddUserToGroupParams = z.infer<typeof addUserToGroupSchema>;

/**
 * Add User to Group operation definition
 */
export const addUserToGroupOperation: OperationDefinition = (() => {
    try {
        return {
            id: "addUserToGroup",
            name: "Add User to Group",
            description: "Add a user to a group in Okta",
            category: "groups",
            inputSchema: addUserToGroupSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create addUserToGroupOperation");
        throw new Error(
            `Failed to create addUserToGroup operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute add user to group operation
 */
export async function executeAddUserToGroup(
    client: OktaClient,
    params: AddUserToGroupParams
): Promise<OperationResult> {
    try {
        await client.addUserToGroup(params.groupId, params.userId);

        return {
            success: true,
            data: {
                groupId: params.groupId,
                userId: params.userId,
                added: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add user to group",
                retryable: false
            }
        };
    }
}
