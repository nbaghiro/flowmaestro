import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Roles operation schema
 */
export const listRolesSchema = z.object({
    page: z.number().min(0).optional().describe("Page number (zero-indexed)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of roles per page (max 100, default 50)"),
    includeTotals: z.boolean().optional().describe("Include total count in response (default true)")
});

export type ListRolesParams = z.infer<typeof listRolesSchema>;

/**
 * List Roles operation definition
 */
export const listRolesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listRoles",
            name: "List Roles",
            description: "List all roles in the Auth0 tenant",
            category: "roles",
            inputSchema: listRolesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create listRolesOperation");
        throw new Error(
            `Failed to create listRoles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list roles operation
 */
export async function executeListRoles(
    client: Auth0Client,
    params: ListRolesParams
): Promise<OperationResult> {
    try {
        const response = await client.listRoles({
            page: params.page,
            per_page: params.perPage,
            include_totals: params.includeTotals
        });

        const roles = response.roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description
        }));

        return {
            success: true,
            data: {
                roles,
                total: response.total,
                page: params.page || 0,
                perPage: params.perPage || 50
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list roles",
                retryable: true
            }
        };
    }
}
