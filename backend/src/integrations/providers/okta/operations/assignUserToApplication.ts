import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaUserIdSchema, OktaAppIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Assign User to Application operation schema
 */
export const assignUserToApplicationSchema = z.object({
    appId: OktaAppIdSchema,
    userId: OktaUserIdSchema
});

export type AssignUserToApplicationParams = z.infer<typeof assignUserToApplicationSchema>;

/**
 * Assign User to Application operation definition
 */
export const assignUserToApplicationOperation: OperationDefinition = (() => {
    try {
        return {
            id: "assignUserToApplication",
            name: "Assign User to Application",
            description: "Assign a user to an application in Okta",
            category: "applications",
            inputSchema: assignUserToApplicationSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Okta", err: error },
            "Failed to create assignUserToApplicationOperation"
        );
        throw new Error(
            `Failed to create assignUserToApplication operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute assign user to application operation
 */
export async function executeAssignUserToApplication(
    client: OktaClient,
    params: AssignUserToApplicationParams
): Promise<OperationResult> {
    try {
        await client.assignUserToApplication(params.appId, params.userId);

        return {
            success: true,
            data: {
                appId: params.appId,
                userId: params.userId,
                assigned: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to assign user to application",
                retryable: false
            }
        };
    }
}
