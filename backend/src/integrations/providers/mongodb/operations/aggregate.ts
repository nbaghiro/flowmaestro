import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * Aggregate operation schema
 */
export const aggregateSchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    pipeline: z
        .array(z.record(z.any()))
        .min(1)
        .describe(
            "Aggregation pipeline stages (e.g., [{ $match: { status: 'active' } }, { $group: { _id: '$category', count: { $sum: 1 } } }])"
        ),
    options: z
        .object({
            allowDiskUse: z
                .boolean()
                .optional()
                .describe("Allow writing to temporary files during aggregation"),
            maxTimeMS: z.number().optional().describe("Maximum execution time in milliseconds"),
            bypassDocumentValidation: z
                .boolean()
                .optional()
                .describe("Allow operations to bypass document validation")
        })
        .optional()
        .describe("Aggregation options"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type AggregateParams = z.infer<typeof aggregateSchema>;

/**
 * Aggregate operation definition
 */
export const aggregateOperation: OperationDefinition = {
    id: "aggregate",
    name: "Aggregate",
    description: "Execute an aggregation pipeline on a collection",
    category: "database",
    inputSchema: aggregateSchema,
    retryable: false,
    timeout: 120000 // 2 minutes for complex aggregations
};

/**
 * Execute aggregate operation
 */
export async function executeAggregate(db: Db, params: AggregateParams): Promise<OperationResult> {
    try {
        const results = await db
            .collection(params.collection)
            .aggregate(params.pipeline, {
                allowDiskUse: params.options?.allowDiskUse,
                maxTimeMS: params.options?.maxTimeMS,
                bypassDocumentValidation: params.options?.bypassDocumentValidation
            })
            .toArray();

        return {
            success: true,
            data: {
                result: results,
                count: results.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to execute aggregation",
                retryable: false
            }
        };
    }
}
