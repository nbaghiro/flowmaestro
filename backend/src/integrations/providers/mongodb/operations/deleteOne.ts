import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * DeleteOne operation schema
 */
export const deleteOneSchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    filter: z.record(z.any()).describe("Query filter to find document to delete"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type DeleteOneParams = z.infer<typeof deleteOneSchema>;

/**
 * DeleteOne operation definition
 */
export const deleteOneOperation: OperationDefinition = {
    id: "deleteOne",
    name: "Delete One Document",
    description: "Delete a single document matching the filter",
    category: "database",
    inputSchema: deleteOneSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute deleteOne operation
 */
export async function executeDeleteOne(db: Db, params: DeleteOneParams): Promise<OperationResult> {
    try {
        const result = await db.collection(params.collection).deleteOne(params.filter);

        return {
            success: true,
            data: {
                result: {
                    deletedCount: result.deletedCount,
                    acknowledged: result.acknowledged
                },
                count: result.deletedCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete document",
                retryable: false
            }
        };
    }
}
