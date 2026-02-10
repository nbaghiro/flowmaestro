import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Delete bucket input schema
 */
export const deleteBucketSchema = z.object({
    bucketName: z.string().min(3).max(63).describe("Name of the bucket to delete (must be empty)")
});

export type DeleteBucketParams = z.infer<typeof deleteBucketSchema>;

/**
 * Delete bucket operation definition
 */
export const deleteBucketOperation: OperationDefinition = {
    id: "deleteBucket",
    name: "Delete Bucket",
    description: "Delete a Cloud Storage bucket (must be empty)",
    category: "buckets",
    retryable: false,
    inputSchema: deleteBucketSchema
};

/**
 * Execute delete bucket operation
 */
export async function executeDeleteBucket(
    client: GoogleCloudStorageClient,
    params: DeleteBucketParams
): Promise<OperationResult> {
    try {
        await client.deleteBucket(params.bucketName);

        return {
            success: true,
            data: {
                deleted: true,
                bucketName: params.bucketName
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete bucket";
        const isNotEmpty = message.includes("not empty");
        const isNotFound = message.includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : isNotEmpty ? "validation" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
