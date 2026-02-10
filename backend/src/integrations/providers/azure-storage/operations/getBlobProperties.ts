import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Get blob properties input schema
 */
export const getBlobPropertiesSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)")
});

export type GetBlobPropertiesParams = z.infer<typeof getBlobPropertiesSchema>;

/**
 * Get blob properties operation definition
 */
export const getBlobPropertiesOperation: OperationDefinition = {
    id: "getBlobProperties",
    name: "Get Blob Properties",
    description: "Get metadata and properties for a blob",
    category: "blobs",
    retryable: true,
    inputSchema: getBlobPropertiesSchema
};

/**
 * Execute get blob properties operation
 */
export async function executeGetBlobProperties(
    client: AzureStorageClient,
    params: GetBlobPropertiesParams
): Promise<OperationResult> {
    try {
        const response = await client.getBlobProperties({
            container: params.container,
            blob: params.blob
        });

        return {
            success: true,
            data: {
                container: params.container,
                blob: params.blob,
                contentType: response.contentType,
                contentLength: response.contentLength,
                lastModified: response.lastModified,
                eTag: response.eTag,
                blobType: response.blobType,
                accessTier: response.accessTier,
                metadata: response.metadata
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get blob properties";
        const isNotFound = message.includes("BlobNotFound") || message.includes("404");

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
