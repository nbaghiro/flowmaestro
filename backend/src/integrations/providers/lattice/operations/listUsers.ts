import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Users operation schema
 */
export const listUsersSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
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
            description: "List all users in Lattice with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listUsersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create listUsersOperation");
        throw new Error(
            `Failed to create listUsers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list users operation
 */
export async function executeListUsers(
    client: LatticeClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const response = await client.listUsers({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                users: response.data.map((user) => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    title: user.title,
                    department: user.department,
                    managerId: user.managerId,
                    managerName: user.managerName,
                    status: user.status,
                    startDate: user.startDate,
                    avatarUrl: user.avatarUrl
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
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
