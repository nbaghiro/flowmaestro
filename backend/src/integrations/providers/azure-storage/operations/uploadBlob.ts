import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Upload blob input schema
 */
export const uploadBlobSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)"),
    body: z.string().describe("File content as base64 encoded string"),
    contentType: z.string().default("application/octet-stream").describe("MIME type of the blob"),
    metadata: z.record(z.string()).optional().describe("Custom metadata key-value pairs")
});

export type UploadBlobParams = z.infer<typeof uploadBlobSchema>;

/**
 * Upload blob operation definition
 */
export const uploadBlobOperation: OperationDefinition = {
    id: "uploadBlob",
    name: "Upload Blob",
    description: "Upload a file to a blob container",
    category: "blobs",
    retryable: true,
    inputSchema: uploadBlobSchema
};

/**
 * Execute upload blob operation
 */
export async function executeUploadBlob(
    client: AzureStorageClient,
    params: UploadBlobParams
): Promise<OperationResult> {
    try {
        const response = await client.uploadBlob({
            container: params.container,
            blob: params.blob,
            body: params.body,
            contentType: params.contentType,
            metadata: params.metadata
        });

        return {
            success: true,
            data: {
                container: params.container,
                blob: params.blob,
                eTag: response.eTag,
                lastModified: response.lastModified
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload blob";
        const isNotFound = message.includes("ContainerNotFound");

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
