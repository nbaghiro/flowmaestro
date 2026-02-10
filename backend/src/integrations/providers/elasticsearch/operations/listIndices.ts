import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * List indices operation schema
 */
export const listIndicesSchema = z.object({
    pattern: z
        .string()
        .optional()
        .describe("Index pattern to filter (e.g., 'logs-*'). Defaults to all indices.")
});

export type ListIndicesParams = z.infer<typeof listIndicesSchema>;

/**
 * List indices operation definition
 */
export const listIndicesOperation: OperationDefinition = {
    id: "listIndices",
    name: "List Indices",
    description: "List all indices matching an optional pattern",
    category: "database",
    inputSchema: listIndicesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list indices operation
 */
export async function executeListIndices(
    client: ElasticsearchClient,
    params: ListIndicesParams
): Promise<OperationResult> {
    try {
        const indices = await client.listIndices(params.pattern);

        return {
            success: true,
            data: {
                indices: indices.map((idx) => ({
                    name: idx.index,
                    health: idx.health,
                    status: idx.status,
                    primaryShards: parseInt(idx.pri, 10) || 0,
                    replicaShards: parseInt(idx.rep, 10) || 0,
                    docsCount: parseInt(idx["docs.count"], 10) || 0,
                    docsDeleted: parseInt(idx["docs.deleted"], 10) || 0,
                    storeSize: idx["store.size"],
                    primaryStoreSize: idx["pri.store.size"]
                })),
                count: indices.length
            }
        };
    } catch (error) {
        return mapError(error);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown): OperationResult {
    const message = error instanceof Error ? error.message : "List indices failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    return {
        success: false,
        error: {
            type: "server_error",
            message,
            retryable: statusCode === 503 || statusCode === 429
        }
    };
}
