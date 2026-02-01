import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Batch update input schema
 * Supports all Google Docs API batchUpdate request types
 */
export const batchUpdateSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document to update"),
    requests: z
        .array(z.record(z.unknown()))
        .min(1)
        .describe("Array of update requests (insertText, deleteContentRange, etc.)")
});

export type BatchUpdateParams = z.infer<typeof batchUpdateSchema>;

/**
 * Batch update operation definition
 */
export const batchUpdateOperation: OperationDefinition = {
    id: "batchUpdate",
    name: "Batch Update Document",
    description:
        "Apply multiple updates to a document atomically. Supports all Google Docs API request types including insertText, deleteContentRange, insertInlineImage, createParagraphBullets, and more.",
    category: "documents",
    retryable: true,
    inputSchema: batchUpdateSchema
};

interface BatchUpdateResponse {
    documentId: string;
    replies?: unknown[];
    writeControl?: {
        requiredRevisionId?: string;
    };
}

/**
 * Execute batch update operation
 */
export async function executeBatchUpdate(
    client: GoogleDocsClient,
    params: BatchUpdateParams
): Promise<OperationResult> {
    try {
        const response = (await client.batchUpdate(
            params.documentId,
            params.requests
        )) as BatchUpdateResponse;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                replies: response.replies,
                writeControl: response.writeControl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update document",
                retryable: true
            }
        };
    }
}
