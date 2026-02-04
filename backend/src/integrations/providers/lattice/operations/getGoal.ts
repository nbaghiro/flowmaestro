import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Goal operation schema
 */
export const getGoalSchema = z.object({
    goalId: z.string().min(1).describe("The unique identifier of the goal")
});

export type GetGoalParams = z.infer<typeof getGoalSchema>;

/**
 * Get Goal operation definition
 */
export const getGoalOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getGoal",
            name: "Get Goal",
            description: "Get detailed goal information by ID from Lattice",
            category: "hr",
            actionType: "read",
            inputSchema: getGoalSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create getGoalOperation");
        throw new Error(
            `Failed to create getGoal operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get goal operation
 */
export async function executeGetGoal(
    client: LatticeClient,
    params: GetGoalParams
): Promise<OperationResult> {
    try {
        const response = await client.getGoal(params.goalId);
        const goal = response.data;

        return {
            success: true,
            data: {
                id: goal.id,
                title: goal.title,
                description: goal.description,
                ownerId: goal.ownerId,
                ownerName: goal.ownerName,
                status: goal.status,
                progress: goal.progress,
                dueDate: goal.dueDate,
                parentGoalId: goal.parentGoalId,
                keyResults: goal.keyResults,
                createdAt: goal.createdAt,
                updatedAt: goal.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get goal",
                retryable: true
            }
        };
    }
}
