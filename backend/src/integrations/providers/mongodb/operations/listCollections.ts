import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db, CollectionInfo } from "mongodb";

/**
 * ListCollections operation schema
 */
export const listCollectionsSchema = z.object({
    filter: z
        .record(z.any())
        .optional()
        .describe("Optional filter for collection names (e.g., { name: { $regex: '^user' } })"),
    nameOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, return only collection names; if false, return full collection info"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type ListCollectionsParams = z.infer<typeof listCollectionsSchema>;

/**
 * ListCollections operation definition
 */
export const listCollectionsOperation: OperationDefinition = {
    id: "listCollections",
    name: "List Collections",
    description: "List all collections in the database",
    category: "database",
    inputSchema: listCollectionsSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute listCollections operation
 */
export async function executeListCollections(
    db: Db,
    params: ListCollectionsParams
): Promise<OperationResult> {
    try {
        let result: unknown;
        let count: number;

        if (params.nameOnly) {
            // When nameOnly is true, just get names
            const collections = await db
                .listCollections(params.filter || {}, { nameOnly: true })
                .toArray();
            result = collections.map((c) => c.name);
            count = collections.length;
        } else {
            // When nameOnly is false, get full info
            const collections = await db.listCollections(params.filter || {}).toArray();
            result = collections.map((c: CollectionInfo) => ({
                name: c.name,
                type: c.type,
                options: c.options,
                info: c.info
            }));
            count = collections.length;
        }

        return {
            success: true,
            data: {
                result,
                count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list collections",
                retryable: false
            }
        };
    }
}
