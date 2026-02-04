import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocDocumentIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Download document operation schema
 */
export const downloadDocumentSchema = z.object({
    documentId: PandaDocDocumentIdSchema
});

export type DownloadDocumentParams = z.infer<typeof downloadDocumentSchema>;

/**
 * Download document operation definition
 */
export const downloadDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "downloadDocument",
            name: "Download Document",
            description: "Download a document as PDF",
            category: "documents",
            inputSchema: downloadDocumentSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create downloadDocumentOperation"
        );
        throw new Error(
            `Failed to create downloadDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute download document operation
 */
export async function executeDownloadDocument(
    client: PandaDocClient,
    params: DownloadDocumentParams
): Promise<OperationResult> {
    try {
        const response = await client.downloadDocument(params.documentId);

        return {
            success: true,
            data: {
                documentId: params.documentId,
                download: response
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download document",
                retryable: true
            }
        };
    }
}
