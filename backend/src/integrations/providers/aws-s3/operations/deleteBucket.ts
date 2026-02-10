import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Delete bucket input schema
 */
export const deleteBucketSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Name of the bucket to delete (must be empty)")
});

export type DeleteBucketParams = z.infer<typeof deleteBucketSchema>;

/**
 * Delete bucket operation definition
 */
export const deleteBucketOperation: OperationDefinition = {
    id: "deleteBucket",
    name: "Delete Bucket",
    description: "Delete an S3 bucket (must be empty)",
    category: "buckets",
    retryable: false,
    inputSchema: deleteBucketSchema
};

/**
 * Execute delete bucket operation
 */
export async function executeDeleteBucket(
    client: AWSS3Client,
    params: DeleteBucketParams
): Promise<OperationResult> {
    try {
        await client.deleteBucket(params.bucket);

        return {
            success: true,
            data: {
                deleted: true,
                bucket: params.bucket
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete bucket";
        const isNotEmpty = message.includes("BucketNotEmpty");
        const isNotFound = message.includes("NoSuchBucket");

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
