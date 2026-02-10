import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Goals operation schema
 */
export const listGoalsSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListGoalsParams = z.infer<typeof listGoalsSchema>;

/**
 * List Goals operation definition
 */
export const listGoalsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listGoals",
            name: "List Goals",
            description: "List all goals in Lattice with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listGoalsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Lattice", err: error }, "Failed to create listGoalsOperation");
        throw new Error(
            `Failed to create listGoals operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list goals operation
 */
export async function executeListGoals(
    client: LatticeClient,
    params: ListGoalsParams
): Promise<OperationResult> {
    try {
        const response = await client.listGoals({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                goals: response.data.map((goal) => ({
                    id: goal.id,
                    title: goal.title,
                    description: goal.description,
                    ownerId: goal.ownerId,
                    ownerName: goal.ownerName,
                    status: goal.status,
                    progress: goal.progress,
                    dueDate: goal.dueDate,
                    parentGoalId: goal.parentGoalId,
                    keyResults: goal.keyResults
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
                message: error instanceof Error ? error.message : "Failed to list goals",
                retryable: true
            }
        };
    }
}
