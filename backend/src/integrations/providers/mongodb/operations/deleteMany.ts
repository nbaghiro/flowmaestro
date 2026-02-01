import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * DeleteMany operation schema
 */
export const deleteManySchema = z.object({
    collection: z.string().min(1).describe("Collection name"),
    filter: z.record(z.any()).describe("Query filter to find documents to delete"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type DeleteManyParams = z.infer<typeof deleteManySchema>;

/**
 * DeleteMany operation definition
 */
export const deleteManyOperation: OperationDefinition = {
    id: "deleteMany",
    name: "Delete Many Documents",
    description: "Delete all documents matching the filter",
    category: "database",
    inputSchema: deleteManySchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute deleteMany operation
 */
export async function executeDeleteMany(
    db: Db,
    params: DeleteManyParams
): Promise<OperationResult> {
    try {
        const result = await db.collection(params.collection).deleteMany(params.filter);

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
                message: error instanceof Error ? error.message : "Failed to delete documents",
                retryable: false
            }
        };
    }
}
