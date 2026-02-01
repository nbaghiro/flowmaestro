import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Db } from "mongodb";

/**
 * Find operation schema
 */
export const findSchema = z.object({
    collection: z.string().min(1).describe("Collection name to query"),
    filter: z
        .record(z.any())
        .optional()
        .default({})
        .describe(
            "Query filter using MongoDB query syntax (e.g., { status: 'active', age: { $gte: 18 } })"
        ),
    projection: z
        .record(z.union([z.literal(0), z.literal(1)]))
        .optional()
        .describe("Fields to include (1) or exclude (0)"),
    sort: z
        .record(z.union([z.literal(1), z.literal(-1)]))
        .optional()
        .describe("Sort order: 1 for ascending, -1 for descending"),
    limit: z.number().int().positive().optional().describe("Maximum number of documents to return"),
    skip: z.number().int().nonnegative().optional().describe("Number of documents to skip"),
    returnFormat: z
        .enum(["array", "single", "count"])
        .optional()
        .default("array")
        .describe(
            "How to format results: array (all docs), single (first doc), count (document count)"
        ),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type FindParams = z.infer<typeof findSchema>;

/**
 * Find operation definition
 */
export const findOperation: OperationDefinition = {
    id: "find",
    name: "Find Documents",
    description: "Query documents from a collection using MongoDB query syntax",
    category: "database",
    inputSchema: findSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute find operation
 */
export async function executeFind(db: Db, params: FindParams): Promise<OperationResult> {
    try {
        const collection = db.collection(params.collection);
        let cursor = collection.find(params.filter || {});

        if (params.projection) {
            cursor = cursor.project(params.projection);
        }
        if (params.sort) {
            cursor = cursor.sort(params.sort);
        }
        if (params.skip) {
            cursor = cursor.skip(params.skip);
        }
        if (params.limit) {
            cursor = cursor.limit(params.limit);
        }

        let result: unknown;
        let count: number;

        switch (params.returnFormat) {
            case "single":
                result = await cursor.limit(1).next();
                count = result ? 1 : 0;
                break;
            case "count":
                result = await collection.countDocuments(params.filter || {});
                count = result as number;
                break;
            case "array":
            default:
                result = await cursor.toArray();
                count = (result as unknown[]).length;
                break;
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
                message:
                    error instanceof Error ? error.message : "Failed to execute find operation",
                retryable: false
            }
        };
    }
}
