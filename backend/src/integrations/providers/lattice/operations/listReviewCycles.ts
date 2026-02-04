import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Review Cycles operation schema
 */
export const listReviewCyclesSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListReviewCyclesParams = z.infer<typeof listReviewCyclesSchema>;

/**
 * List Review Cycles operation definition
 */
export const listReviewCyclesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listReviewCycles",
            name: "List Review Cycles",
            description: "List all review cycles in Lattice with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listReviewCyclesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Lattice", err: error },
            "Failed to create listReviewCyclesOperation"
        );
        throw new Error(
            `Failed to create listReviewCycles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list review cycles operation
 */
export async function executeListReviewCycles(
    client: LatticeClient,
    params: ListReviewCyclesParams
): Promise<OperationResult> {
    try {
        const response = await client.listReviewCycles({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                reviewCycles: response.data.map((cycle) => ({
                    id: cycle.id,
                    name: cycle.name,
                    status: cycle.status,
                    startDate: cycle.startDate,
                    endDate: cycle.endDate,
                    reviewType: cycle.reviewType,
                    participantCount: cycle.participantCount,
                    completedCount: cycle.completedCount,
                    createdAt: cycle.createdAt,
                    updatedAt: cycle.updatedAt
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
                message: error instanceof Error ? error.message : "Failed to list review cycles",
                retryable: true
            }
        };
    }
}
