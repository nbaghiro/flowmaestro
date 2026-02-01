import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * InsertMany operation schema
 */
export const insertManySchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    documents: z.array(z.record(z.any())).min(1).describe("Array of documents to insert"),
    ordered: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, stop on first error; if false, continue inserting remaining documents"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type InsertManyParams = z.infer<typeof insertManySchema>;

/**
 * InsertMany operation definition
 */
export const insertManyOperation: OperationDefinition = {
    id: "insertMany",
    name: "Insert Many Documents",
    description: "Insert multiple documents into a collection",
    category: "database",
    inputSchema: insertManySchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute insertMany operation
 */
export async function executeInsertMany(
    db: Db,
    params: InsertManyParams
): Promise<OperationResult> {
    try {
        const result = await db.collection(params.collection).insertMany(params.documents, {
            ordered: params.ordered
        });

        return {
            success: true,
            data: {
                result: {
                    insertedIds: result.insertedIds,
                    insertedCount: result.insertedCount,
                    acknowledged: result.acknowledged
                },
                count: result.insertedCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to insert documents",
                retryable: false
            }
        };
    }
}
