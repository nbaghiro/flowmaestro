import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Delete index operation schema
 */
export const deleteIndexSchema = z.object({
    index: z.string().min(1).describe("Index name to delete")
});

export type DeleteIndexParams = z.infer<typeof deleteIndexSchema>;

/**
 * Delete index operation definition
 */
export const deleteIndexOperation: OperationDefinition = {
    id: "deleteIndex",
    name: "Delete Index",
    description: "Delete an index and all its documents",
    category: "database",
    inputSchema: deleteIndexSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete index operation
 */
export async function executeDeleteIndex(
    client: ElasticsearchClient,
    params: DeleteIndexParams
): Promise<OperationResult> {
    try {
        const response = await client.deleteIndex(params.index);

        return {
            success: true,
            data: {
                acknowledged: response.acknowledged,
                index: params.index
            }
        };
    } catch (error) {
        return mapError(error, params.index);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown, index: string): OperationResult {
    const message = error instanceof Error ? error.message : "Delete index failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 404) {
        return {
            success: false,
            error: {
                type: "not_found",
                message: `Index '${index}' not found`,
                retryable: false
            }
        };
    }

    return {
        success: false,
        error: {
            type: "server_error",
            message,
            retryable: statusCode === 503 || statusCode === 429
        }
    };
}
