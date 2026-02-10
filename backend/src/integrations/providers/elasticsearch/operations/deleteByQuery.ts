import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Delete by query operation schema
 */
export const deleteByQuerySchema = z.object({
    index: z.string().min(1).describe("Index name"),
    query: z.record(z.unknown()).describe("Elasticsearch Query DSL to match documents for deletion")
});

export type DeleteByQueryParams = z.infer<typeof deleteByQuerySchema>;

/**
 * Delete by query operation definition
 */
export const deleteByQueryOperation: OperationDefinition = {
    id: "deleteByQuery",
    name: "Delete by Query",
    description: "Delete documents matching a query",
    category: "database",
    inputSchema: deleteByQuerySchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute delete by query operation
 */
export async function executeDeleteByQuery(
    client: ElasticsearchClient,
    params: DeleteByQueryParams
): Promise<OperationResult> {
    try {
        const response = await client.deleteByQuery(params.index, params.query);

        return {
            success: true,
            data: {
                deleted: response.deleted,
                total: response.total,
                failures: response.failures
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
    const message = error instanceof Error ? error.message : "Delete by query failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    let type: "validation" | "not_found" | "server_error" = "server_error";
    let retryable = false;

    if (statusCode === 404 || message.includes("index_not_found")) {
        type = "not_found";
    } else if (statusCode === 400 || message.includes("parsing_exception")) {
        type = "validation";
    } else if (statusCode === 503 || statusCode === 429) {
        retryable = true;
    }

    return {
        success: false,
        error: { type, message, retryable }
    };
}
