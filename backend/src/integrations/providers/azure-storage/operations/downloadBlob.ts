import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Download blob input schema
 */
export const downloadBlobSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)")
});

export type DownloadBlobParams = z.infer<typeof downloadBlobSchema>;

/**
 * Download blob operation definition
 */
export const downloadBlobOperation: OperationDefinition = {
    id: "downloadBlob",
    name: "Download Blob",
    description: "Download a file from a blob container",
    category: "blobs",
    retryable: true,
    inputSchema: downloadBlobSchema
};

/**
 * Execute download blob operation
 */
export async function executeDownloadBlob(
    client: AzureStorageClient,
    params: DownloadBlobParams
): Promise<OperationResult> {
    try {
        const response = await client.downloadBlob({
            container: params.container,
            blob: params.blob
        });

        return {
            success: true,
            data: {
                content: response.body.toString("base64"),
                contentType: response.contentType,
                size: response.contentLength,
                lastModified: response.lastModified,
                eTag: response.eTag
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download blob";
        const isNotFound =
            message.includes("BlobNotFound") || message.includes("ContainerNotFound");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
