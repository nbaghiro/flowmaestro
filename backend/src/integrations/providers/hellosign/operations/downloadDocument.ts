import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { HelloSignClient } from "../client/HelloSignClient";
import { HelloSignRequestIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Download document operation schema
 */
export const downloadDocumentSchema = z.object({
    signature_request_id: HelloSignRequestIdSchema,
    file_type: z
        .enum(["pdf", "zip"])
        .default("pdf")
        .describe("File format - pdf for single file, zip for multiple")
});

export type DownloadDocumentParams = z.infer<typeof downloadDocumentSchema>;

/**
 * Download document operation definition
 */
export const downloadDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "downloadDocument",
            name: "Download Signed Document",
            description: "Get a download URL for the signed document(s)",
            category: "documents",
            inputSchema: downloadDocumentSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
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
    client: HelloSignClient,
    params: DownloadDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.downloadFiles(
            params.signature_request_id,
            params.file_type
        )) as {
            file_url?: string;
            expires_at?: number;
        };

        return {
            success: true,
            data: {
                signature_request_id: params.signature_request_id,
                file_type: params.file_type,
                download_url: response.file_url,
                expires_at: response.expires_at
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
