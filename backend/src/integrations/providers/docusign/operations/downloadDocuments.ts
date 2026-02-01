import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DocuSignClient } from "../client/DocuSignClient";
import { DocuSignEnvelopeIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Download documents operation schema
 */
export const downloadDocumentsSchema = z.object({
    envelopeId: DocuSignEnvelopeIdSchema,
    documentId: z
        .string()
        .default("combined")
        .describe(
            "Document ID or 'combined' for all documents, 'certificate' for signing certificate"
        )
});

export type DownloadDocumentsParams = z.infer<typeof downloadDocumentsSchema>;

/**
 * Download documents operation definition
 */
export const downloadDocumentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "downloadDocuments",
            name: "Download Documents",
            description: "Get download information for envelope documents",
            category: "documents",
            inputSchema: downloadDocumentsSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create downloadDocumentsOperation"
        );
        throw new Error(
            `Failed to create downloadDocuments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute download documents operation
 */
export async function executeDownloadDocuments(
    client: DocuSignClient,
    params: DownloadDocumentsParams
): Promise<OperationResult> {
    try {
        const response = (await client.downloadDocuments(
            params.envelopeId,
            params.documentId
        )) as unknown;

        return {
            success: true,
            data: {
                envelopeId: params.envelopeId,
                documentId: params.documentId,
                // DocuSign returns document info or binary data
                // This would need to be adapted based on actual use case
                documentInfo: response
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download documents",
                retryable: true
            }
        };
    }
}
