import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Index document operation schema
 */
export const indexDocumentSchema = z.object({
    index: z.string().min(1).describe("Index name"),
    document: z.record(z.unknown()).describe("Document to index"),
    id: z.string().optional().describe("Document ID (auto-generated if not provided)")
});

export type IndexDocumentParams = z.infer<typeof indexDocumentSchema>;

/**
 * Index document operation definition
 */
export const indexDocumentOperation: OperationDefinition = {
    id: "indexDocument",
    name: "Index Document",
    description: "Create or update a document in an index",
    category: "database",
    inputSchema: indexDocumentSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute index document operation
 */
export async function executeIndexDocument(
    client: ElasticsearchClient,
    params: IndexDocumentParams
): Promise<OperationResult> {
    try {
        const response = await client.indexDocument(params.index, params.document, params.id);

        return {
            success: true,
            data: {
                _id: response._id,
                _index: response._index,
                _version: response._version,
                result: response.result,
                created: response.result === "created"
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
    const message = error instanceof Error ? error.message : "Index document failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    let type: "validation" | "not_found" | "server_error" = "server_error";
    let retryable = false;

    if (statusCode === 400 || message.includes("mapper_parsing_exception")) {
        type = "validation";
    } else if (statusCode === 503 || statusCode === 429) {
        retryable = true;
    }

    return {
        success: false,
        error: { type, message, retryable }
    };
}
