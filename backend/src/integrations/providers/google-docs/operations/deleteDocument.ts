import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Delete document input schema
 */
export const deleteDocumentSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document to delete")
});

export type DeleteDocumentParams = z.infer<typeof deleteDocumentSchema>;

/**
 * Delete document operation definition
 */
export const deleteDocumentOperation: OperationDefinition = {
    id: "deleteDocument",
    name: "Delete Document",
    description: "Permanently delete a Google Docs document (uses Drive API)",
    category: "documents",
    retryable: true,
    inputSchema: deleteDocumentSchema
};

/**
 * Execute delete document operation
 */
export async function executeDeleteDocument(
    client: GoogleDocsClient,
    params: DeleteDocumentParams
): Promise<OperationResult> {
    try {
        await client.deleteDocument(params.documentId);

        return {
            success: true,
            data: {
                deleted: true,
                documentId: params.documentId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete document",
                retryable: true
            }
        };
    }
}
