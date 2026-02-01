import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Create document input schema
 */
export const createDocumentSchema = z.object({
    title: z.string().min(1).max(256).describe("Document title")
});

export type CreateDocumentParams = z.infer<typeof createDocumentSchema>;

/**
 * Create document operation definition
 */
export const createDocumentOperation: OperationDefinition = {
    id: "createDocument",
    name: "Create Document",
    description: "Create a new Google Docs document",
    category: "documents",
    retryable: true,
    inputSchema: createDocumentSchema
};

interface CreateDocumentResponse {
    documentId: string;
    title: string;
    revisionId?: string;
}

/**
 * Execute create document operation
 */
export async function executeCreateDocument(
    client: GoogleDocsClient,
    params: CreateDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.createDocument(params.title)) as CreateDocumentResponse;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                title: response.title,
                documentUrl: `https://docs.google.com/document/d/${response.documentId}/edit`,
                revisionId: response.revisionId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create document",
                retryable: true
            }
        };
    }
}
