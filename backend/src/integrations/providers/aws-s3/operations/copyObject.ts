import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Copy object input schema
 */
export const copyObjectSchema = z.object({
    sourceBucket: z.string().min(3).max(63).describe("Source bucket name"),
    sourceKey: z.string().min(1).max(1024).describe("Source object key"),
    destinationBucket: z.string().min(3).max(63).describe("Destination bucket name"),
    destinationKey: z.string().min(1).max(1024).describe("Destination object key"),
    metadata: z
        .record(z.string())
        .optional()
        .describe("Custom metadata (replaces source metadata if provided)"),
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
        .describe("Storage class for the destination object")
});

export type CopyObjectParams = z.infer<typeof copyObjectSchema>;

/**
 * Copy object operation definition
 */
export const copyObjectOperation: OperationDefinition = {
    id: "copyObject",
    name: "Copy Object",
    description: "Copy an object within or between S3 buckets",
    category: "objects",
    retryable: true,
    inputSchema: copyObjectSchema
};

/**
 * Execute copy object operation
 */
export async function executeCopyObject(
    client: AWSS3Client,
    params: CopyObjectParams
): Promise<OperationResult> {
    try {
        const response = await client.copyObject({
            sourceBucket: params.sourceBucket,
            sourceKey: params.sourceKey,
            destinationBucket: params.destinationBucket,
            destinationKey: params.destinationKey,
            metadata: params.metadata,
            storageClass: params.storageClass
        });

        return {
            success: true,
            data: {
                sourceBucket: params.sourceBucket,
                sourceKey: params.sourceKey,
                destinationBucket: params.destinationBucket,
                destinationKey: params.destinationKey,
                eTag: response.eTag,
                lastModified: response.lastModified
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to copy object";
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
