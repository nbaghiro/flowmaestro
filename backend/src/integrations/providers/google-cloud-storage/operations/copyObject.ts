import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Copy object input schema
 */
export const copyObjectSchema = z.object({
    sourceBucket: z.string().min(3).max(63).describe("Source bucket name"),
    sourceObject: z.string().min(1).max(1024).describe("Source object name (path in bucket)"),
    destinationBucket: z.string().min(3).max(63).describe("Destination bucket name"),
    destinationObject: z
        .string()
        .min(1)
        .max(1024)
        .describe("Destination object name (path in bucket)")
});

export type CopyObjectParams = z.infer<typeof copyObjectSchema>;

/**
 * Copy object operation definition
 */
export const copyObjectOperation: OperationDefinition = {
    id: "copyObject",
    name: "Copy Object",
    description: "Copy an object within or between Cloud Storage buckets",
    category: "objects",
    retryable: true,
    inputSchema: copyObjectSchema
};

/**
 * Execute copy object operation
 */
export async function executeCopyObject(
    client: GoogleCloudStorageClient,
    params: CopyObjectParams
): Promise<OperationResult> {
    try {
        const response = await client.copyObject({
            sourceBucket: params.sourceBucket,
            sourceObject: params.sourceObject,
            destinationBucket: params.destinationBucket,
            destinationObject: params.destinationObject
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to copy object";
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
