import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Delete document operation schema
 */
export const deleteDocumentSchema = z.object({
    index: z.string().min(1).describe("Index name"),
    id: z.string().min(1).describe("Document ID to delete")
});

export type DeleteDocumentParams = z.infer<typeof deleteDocumentSchema>;

/**
 * Delete document operation definition
 */
export const deleteDocumentOperation: OperationDefinition = {
    id: "deleteDocument",
    name: "Delete Document",
    description: "Delete a document by its ID",
    category: "database",
    inputSchema: deleteDocumentSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete document operation
 */
export async function executeDeleteDocument(
    client: ElasticsearchClient,
    params: DeleteDocumentParams
): Promise<OperationResult> {
    try {
        const response = await client.deleteDocument(params.index, params.id);

        return {
            success: true,
            data: {
                _id: response._id,
                _index: response._index,
                result: response.result,
                deleted: response.result === "deleted"
            }
        };
    } catch (error) {
        return mapError(error, params.index, params.id);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown, index: string, id: string): OperationResult {
    const message = error instanceof Error ? error.message : "Delete document failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 404) {
        return {
            success: false,
            error: {
                type: "not_found",
                message: `Document '${id}' not found in index '${index}'`,
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
