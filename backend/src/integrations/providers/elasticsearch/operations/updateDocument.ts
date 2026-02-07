import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Update document operation schema
 */
export const updateDocumentSchema = z.object({
    index: z.string().min(1).describe("Index name"),
    id: z.string().min(1).describe("Document ID"),
    doc: z.record(z.unknown()).describe("Partial document with fields to update"),
    upsert: z.boolean().optional().default(false).describe("Create document if it doesn't exist")
});

export type UpdateDocumentParams = z.infer<typeof updateDocumentSchema>;

/**
 * Update document operation definition
 */
export const updateDocumentOperation: OperationDefinition = {
    id: "updateDocument",
    name: "Update Document",
    description: "Partial update a document by ID",
    category: "database",
    inputSchema: updateDocumentSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute update document operation
 */
export async function executeUpdateDocument(
    client: ElasticsearchClient,
    params: UpdateDocumentParams
): Promise<OperationResult> {
    try {
        const response = await client.updateDocument(params.index, params.id, params.doc, {
            upsert: params.upsert
        });

        return {
            success: true,
            data: {
                _id: response._id,
                _index: response._index,
                _version: response._version,
                result: response.result
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
    const message = error instanceof Error ? error.message : "Update document failed";
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

    let type: "validation" | "server_error" = "server_error";
    let retryable = false;

    if (statusCode === 400) {
        type = "validation";
    } else if (statusCode === 503 || statusCode === 429) {
        retryable = true;
    }

    return {
        success: false,
        error: { type, message, retryable }
    };
}
