import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Goal operation schema
 */
export const createGoalSchema = z.object({
    title: z.string().min(1).describe("Title of the goal"),
    ownerId: z.string().min(1).describe("ID of the goal owner"),
    description: z.string().optional().describe("Description of the goal"),
    dueDate: z.string().optional().describe("Due date in ISO 8601 format (YYYY-MM-DD)"),
    parentGoalId: z.string().optional().describe("ID of the parent goal for alignment")
});

export type CreateGoalParams = z.infer<typeof createGoalSchema>;

/**
 * Create Goal operation definition
 */
export const createGoalOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createGoal",
            name: "Create Goal",
            description: "Create a new goal in Lattice",
            category: "hr",
            actionType: "write",
            inputSchema: createGoalSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create createGoalOperation");
        throw new Error(
            `Failed to create createGoal operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create goal operation
 */
export async function executeCreateGoal(
    client: LatticeClient,
    params: CreateGoalParams
): Promise<OperationResult> {
    try {
        const response = await client.createGoal({
            title: params.title,
            ownerId: params.ownerId,
            description: params.description,
            dueDate: params.dueDate,
            parentGoalId: params.parentGoalId
        });

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
                message: error instanceof Error ? error.message : "Failed to create goal",
                retryable: false
            }
        };
    }
}
