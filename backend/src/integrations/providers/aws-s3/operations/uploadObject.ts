import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Upload object input schema
 */
export const uploadObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    key: z.string().min(1).max(1024).describe("Object key (path in bucket)"),
    body: z.string().describe("File content as base64 encoded string"),
    contentType: z.string().default("application/octet-stream").describe("MIME type of the object"),
    metadata: z.record(z.string()).optional().describe("Custom metadata key-value pairs"),
    storageClass: z
        .enum([
            "STANDARD",
            "REDUCED_REDUNDANCY",
            "STANDARD_IA",
            "ONEZONE_IA",
            "INTELLIGENT_TIERING",
            "GLACIER",
            "DEEP_ARCHIVE",
            "GLACIER_IR"
        ])
        .optional()
        .describe("Storage class for the object")
});

export type UploadObjectParams = z.infer<typeof uploadObjectSchema>;

/**
 * Upload object operation definition
 */
export const uploadObjectOperation: OperationDefinition = {
    id: "uploadObject",
    name: "Upload Object",
    description: "Upload a file to an S3 bucket",
    category: "objects",
    retryable: true,
    inputSchema: uploadObjectSchema
};

/**
 * Execute upload object operation
 */
export async function executeUploadObject(
    client: AWSS3Client,
    params: UploadObjectParams
): Promise<OperationResult> {
    try {
        const response = await client.putObject({
            bucket: params.bucket,
            key: params.key,
            body: params.body,
            contentType: params.contentType,
            metadata: params.metadata,
            storageClass: params.storageClass
        });

        return {
            success: true,
            data: {
                bucket: params.bucket,
                key: params.key,
                eTag: response.eTag,
                versionId: response.versionId
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload object";
        const isNotFound = message.includes("NoSuchBucket");

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
