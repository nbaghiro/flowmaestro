import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Get document operation schema
 */
export const getDocumentSchema = z.object({
    index: z.string().min(1).describe("Index name"),
    id: z.string().min(1).describe("Document ID")
});

export type GetDocumentParams = z.infer<typeof getDocumentSchema>;

/**
 * Get document operation definition
 */
export const getDocumentOperation: OperationDefinition = {
    id: "getDocument",
    name: "Get Document",
    description: "Retrieve a document by its ID",
    category: "database",
    inputSchema: getDocumentSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get document operation
 */
export async function executeGetDocument(
    client: ElasticsearchClient,
    params: GetDocumentParams
): Promise<OperationResult> {
    try {
        const response = await client.getDocument(params.index, params.id);

        if (!response.found) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Document '${params.id}' not found in index '${params.index}'`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                _id: response._id,
                _index: response._index,
                ...response._source
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
    const message = error instanceof Error ? error.message : "Get document failed";
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
