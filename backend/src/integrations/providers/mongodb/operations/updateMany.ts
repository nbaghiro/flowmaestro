import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * UpdateMany operation schema
 */
export const updateManySchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    filter: z.record(z.any()).describe("Query filter to find documents to update"),
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

export type UpdateManyParams = z.infer<typeof updateManySchema>;

/**
 * UpdateMany operation definition
 */
export const updateManyOperation: OperationDefinition = {
    id: "updateMany",
    name: "Update Many Documents",
    description: "Update all documents matching the filter",
    category: "database",
    inputSchema: updateManySchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute updateMany operation
 */
export async function executeUpdateMany(
    db: Db,
    params: UpdateManyParams
): Promise<OperationResult> {
    try {
        const result = await db
            .collection(params.collection)
            .updateMany(params.filter, params.update, {
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
                message: error instanceof Error ? error.message : "Failed to update documents",
                retryable: false
            }
        };
    }
}
