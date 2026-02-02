import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Download object input schema
 */
export const downloadObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    object: z.string().min(1).max(1024).describe("Object name (path in bucket)")
});

export type DownloadObjectParams = z.infer<typeof downloadObjectSchema>;

/**
 * Download object operation definition
 */
export const downloadObjectOperation: OperationDefinition = {
    id: "downloadObject",
    name: "Download Object",
    description: "Download a file from a Cloud Storage bucket",
    category: "objects",
    retryable: true,
    inputSchema: downloadObjectSchema
};

/**
 * Execute download object operation
 */
export async function executeDownloadObject(
    client: GoogleCloudStorageClient,
    params: DownloadObjectParams
): Promise<OperationResult> {
    try {
        // First get metadata to know the content type
        const metadata = (await client.getObjectMetadata(params.bucket, params.object)) as {
            name: string;
            contentType: string;
            size: string;
        };

        // Download the content
        const blob = await client.downloadObject(params.bucket, params.object);

        // Convert blob to base64
        const arrayBuffer = await blob.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString("base64");

        return {
            success: true,
            data: {
                content: base64Content,
                contentType: metadata.contentType,
                name: metadata.name,
                size: parseInt(metadata.size, 10)
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download object";
        const isNotFound = message.includes("not found");

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
