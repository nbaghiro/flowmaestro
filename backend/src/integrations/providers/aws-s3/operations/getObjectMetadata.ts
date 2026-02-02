import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Get object metadata input schema
 */
export const getObjectMetadataSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    key: z.string().min(1).max(1024).describe("Object key (path in bucket)")
});

export type GetObjectMetadataParams = z.infer<typeof getObjectMetadataSchema>;

/**
 * Get object metadata operation definition
 */
export const getObjectMetadataOperation: OperationDefinition = {
    id: "getObjectMetadata",
    name: "Get Object Metadata",
    description: "Get metadata for an object in an S3 bucket",
    category: "objects",
    retryable: true,
    inputSchema: getObjectMetadataSchema
};

/**
 * Execute get object metadata operation
 */
export async function executeGetObjectMetadata(
    client: AWSS3Client,
    params: GetObjectMetadataParams
): Promise<OperationResult> {
    try {
        const response = await client.getObjectMetadata({
            bucket: params.bucket,
            key: params.key
        });

        return {
            success: true,
            data: {
                bucket: params.bucket,
                key: params.key,
                contentType: response.contentType,
                contentLength: response.contentLength,
                lastModified: response.lastModified,
                eTag: response.eTag,
                metadata: response.metadata
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get object metadata";
        const isNotFound = message.includes("NoSuchKey") || message.includes("404");

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
