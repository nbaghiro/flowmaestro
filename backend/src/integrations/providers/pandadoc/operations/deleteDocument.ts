import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocDocumentIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete document operation schema
 */
export const deleteDocumentSchema = z.object({
    documentId: PandaDocDocumentIdSchema
});

export type DeleteDocumentParams = z.infer<typeof deleteDocumentSchema>;

/**
 * Delete document operation definition
 */
export const deleteDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteDocument",
            name: "Delete Document",
            description: "Move a document to trash",
            category: "documents",
            inputSchema: deleteDocumentSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create deleteDocumentOperation"
        );
        throw new Error(
            `Failed to create deleteDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete document operation
 */
export async function executeDeleteDocument(
    client: PandaDocClient,
    params: DeleteDocumentParams
): Promise<OperationResult> {
    try {
        await client.deleteDocument(params.documentId);

        return {
            success: true,
            data: {
                documentId: params.documentId,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete document",
                retryable: false
            }
        };
    }
}
