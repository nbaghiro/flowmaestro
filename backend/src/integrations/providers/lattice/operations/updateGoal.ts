import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Goal operation schema
 */
export const updateGoalSchema = z.object({
    goalId: z.string().min(1).describe("The unique identifier of the goal to update"),
    title: z.string().min(1).optional().describe("Updated title of the goal"),
    description: z.string().optional().describe("Updated description of the goal"),
    status: z
        .enum(["on_track", "behind", "at_risk", "completed", "not_started", "closed"])
        .optional()
        .describe("Updated status of the goal"),
    progress: z.number().min(0).max(100).optional().describe("Updated progress percentage (0-100)"),
    dueDate: z.string().optional().describe("Updated due date in ISO 8601 format (YYYY-MM-DD)")
});

export type UpdateGoalParams = z.infer<typeof updateGoalSchema>;

/**
 * Update Goal operation definition
 */
export const updateGoalOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateGoal",
            name: "Update Goal",
            description: "Update an existing goal in Lattice",
            category: "hr",
            actionType: "write",
            inputSchema: updateGoalSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create updateGoalOperation");
        throw new Error(
            `Failed to create updateGoal operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update goal operation
 */
export async function executeUpdateGoal(
    client: LatticeClient,
    params: UpdateGoalParams
): Promise<OperationResult> {
    try {
        const { goalId, ...updateData } = params;
        const response = await client.updateGoal(goalId, updateData);
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
                message: error instanceof Error ? error.message : "Failed to update goal",
                retryable: false
            }
        };
    }
}
