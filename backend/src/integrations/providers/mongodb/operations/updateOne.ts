import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * UpdateOne operation schema
 */
export const updateOneSchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    filter: z.record(z.any()).describe("Query filter to find document to update"),
    update: z
        .record(z.any())
        .describe("Update operations (e.g., { $set: { status: 'active' }, $inc: { views: 1 } })"),
    upsert: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, create a new document if no documents match the filter"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type UpdateOneParams = z.infer<typeof updateOneSchema>;

/**
 * UpdateOne operation definition
 */
export const updateOneOperation: OperationDefinition = {
    id: "updateOne",
    name: "Update One Document",
    description: "Update a single document matching the filter",
    category: "database",
    inputSchema: updateOneSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute updateOne operation
 */
export async function executeUpdateOne(db: Db, params: UpdateOneParams): Promise<OperationResult> {
    try {
        const result = await db
            .collection(params.collection)
            .updateOne(params.filter, params.update, {
                upsert: params.upsert
            });

        return {
            success: true,
            data: {
                result: {
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    upsertedId: result.upsertedId,
                    upsertedCount: result.upsertedCount,
                    acknowledged: result.acknowledged
                },
                count: result.modifiedCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update document",
                retryable: false
            }
        };
    }
}
