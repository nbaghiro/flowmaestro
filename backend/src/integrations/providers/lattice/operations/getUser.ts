import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User operation schema
 */
export const getUserSchema = z.object({
    userId: z.string().min(1).describe("The unique identifier of the user")
});

export type GetUserParams = z.infer<typeof getUserSchema>;

/**
 * Get User operation definition
 */
export const getUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUser",
            name: "Get User",
            description: "Get detailed user information by ID from Lattice",
            category: "hr",
            actionType: "read",
            inputSchema: getUserSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create getUserOperation");
        throw new Error(
            `Failed to create getUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user operation
 */
export async function executeGetUser(
    client: LatticeClient,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const response = await client.getUser(params.userId);
        const user = response.data;

        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                title: user.title,
                department: user.department,
                managerId: user.managerId,
                managerName: user.managerName,
                status: user.status,
                startDate: user.startDate,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user",
                retryable: true
            }
        };
    }
}
