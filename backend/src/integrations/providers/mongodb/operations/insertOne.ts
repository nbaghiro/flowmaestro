import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * InsertOne operation schema
 */
export const insertOneSchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    document: z.record(z.any()).describe("Document to insert"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type InsertOneParams = z.infer<typeof insertOneSchema>;

/**
 * InsertOne operation definition
 */
export const insertOneOperation: OperationDefinition = {
    id: "insertOne",
    name: "Insert One Document",
    description: "Insert a single document into a collection",
    category: "database",
    inputSchema: insertOneSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute insertOne operation
 */
export async function executeInsertOne(db: Db, params: InsertOneParams): Promise<OperationResult> {
    try {
        const result = await db.collection(params.collection).insertOne(params.document);

        return {
            success: true,
            data: {
                result: {
                    insertedId: result.insertedId,
                    acknowledged: result.acknowledged
                },
                count: result.acknowledged ? 1 : 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to insert document",
                retryable: false
            }
        };
    }
}
