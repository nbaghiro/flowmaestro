import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Get document input schema
 */
export const getDocumentSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document to retrieve")
});

export type GetDocumentParams = z.infer<typeof getDocumentSchema>;

/**
 * Get document operation definition
 */
export const getDocumentOperation: OperationDefinition = {
    id: "getDocument",
    name: "Get Document",
    description: "Retrieve a Google Docs document by ID, including its content and structure",
    category: "documents",
    retryable: true,
    inputSchema: getDocumentSchema
};

interface DocumentResponse {
    documentId: string;
    title: string;
    body?: {
        content?: unknown[];
    };
    revisionId?: string;
}

/**
 * Execute get document operation
 */
export async function executeGetDocument(
    client: GoogleDocsClient,
    params: GetDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.getDocument(params.documentId)) as DocumentResponse;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                title: response.title,
                body: response.body,
                documentUrl: `https://docs.google.com/document/d/${response.documentId}/edit`,
                revisionId: response.revisionId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get document",
                retryable: true
            }
        };
    }
}
