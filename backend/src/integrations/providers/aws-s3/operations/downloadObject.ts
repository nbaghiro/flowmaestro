import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Download object input schema
 */
export const downloadObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    key: z.string().min(1).max(1024).describe("Object key (path in bucket)")
});

export type DownloadObjectParams = z.infer<typeof downloadObjectSchema>;

/**
 * Download object operation definition
 */
export const downloadObjectOperation: OperationDefinition = {
    id: "downloadObject",
    name: "Download Object",
    description: "Download a file from an S3 bucket",
    category: "objects",
    retryable: true,
    inputSchema: downloadObjectSchema
};

/**
 * Execute download object operation
 */
export async function executeDownloadObject(
    client: AWSS3Client,
    params: DownloadObjectParams
): Promise<OperationResult> {
    try {
        const response = await client.getObject({
            bucket: params.bucket,
            key: params.key
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
        const message = error instanceof Error ? error.message : "Failed to download object";
        const isNotFound = message.includes("NoSuchKey") || message.includes("NoSuchBucket");

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
