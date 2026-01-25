import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Current User operation schema
 */
export const getCurrentUserSchema = z.object({}).describe("No parameters required");

export type GetCurrentUserParams = z.infer<typeof getCurrentUserSchema>;

/**
 * Get Current User operation definition
 */
export const getCurrentUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCurrentUser",
            name: "Get Current User",
            description: "Get the authenticated user's profile information",
            category: "data",
            actionType: "read",
            inputSchema: getCurrentUserSchema,
            inputSchemaJSON: toJSONSchema(getCurrentUserSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create getCurrentUserOperation"
        );
        throw new Error(
            `Failed to create getCurrentUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get current user operation
 */
export async function executeGetCurrentUser(
    client: CalendlyClient,
    _params: GetCurrentUserParams
): Promise<OperationResult> {
    try {
        const response = await client.getCurrentUser();
        const user = response.resource;

        return {
            success: true,
            data: {
                uri: user.uri,
                name: user.name,
                slug: user.slug,
                email: user.email,
                schedulingUrl: user.scheduling_url,
                timezone: user.timezone,
                avatarUrl: user.avatar_url,
                organization: user.current_organization,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current user",
                retryable: true
            }
        };
    }
}
