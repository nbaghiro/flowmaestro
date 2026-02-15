import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Users operation schema
 */
export const listUsersSchema = z.object({
    page: z.number().min(0).optional().describe("Page number (zero-indexed)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of users per page (max 100, default 50)"),
    query: z.string().optional().describe("Lucene query string for filtering users"),
    includeTotals: z.boolean().optional().describe("Include total count in response (default true)")
});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

/**
 * List Users operation definition
 */
export const listUsersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listUsers",
            name: "List Users",
            description: "List all users in the Auth0 tenant with optional filtering",
            category: "users",
            inputSchema: listUsersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create listUsersOperation");
        throw new Error(
            `Failed to create listUsers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list users operation
 */
export async function executeListUsers(
    client: Auth0Client,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const response = await client.listUsers({
            page: params.page,
            per_page: params.perPage,
            include_totals: params.includeTotals,
            q: params.query,
            search_engine: params.query ? "v3" : undefined
        });

        const users = response.users.map((user) => ({
            userId: user.user_id,
            email: user.email,
            emailVerified: user.email_verified,
            name: user.name,
            nickname: user.nickname,
            picture: user.picture,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            blocked: user.blocked
        }));

        return {
            success: true,
            data: {
                users,
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
                message: error instanceof Error ? error.message : "Failed to list users",
                retryable: true
            }
        };
    }
}
