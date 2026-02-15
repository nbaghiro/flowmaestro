import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Group operation schema
 */
export const createGroupSchema = z.object({
    name: z.string().min(1).max(255).describe("Group name"),
    description: z.string().max(1024).optional().describe("Group description")
});

export type CreateGroupParams = z.infer<typeof createGroupSchema>;

/**
 * Create Group operation definition
 */
export const createGroupOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createGroup",
            name: "Create Group",
            description: "Create a new group in Okta",
            category: "groups",
            inputSchema: createGroupSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create createGroupOperation");
        throw new Error(
            `Failed to create createGroup operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create group operation
 */
export async function executeCreateGroup(
    client: OktaClient,
    params: CreateGroupParams
): Promise<OperationResult> {
    try {
        const group = await client.createGroup({
            name: params.name,
            description: params.description
        });

        return {
            success: true,
            data: {
                id: group.id,
                name: group.profile.name,
                description: group.profile.description,
                type: group.type,
                created: group.created
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create group",
                retryable: false
            }
        };
    }
}
