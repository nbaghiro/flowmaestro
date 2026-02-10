import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Create bucket input schema
 */
export const createBucketSchema = z.object({
    bucket: z
        .string()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            "Bucket name must be lowercase, start/end with letter or number"
        )
        .describe("Globally unique bucket name")
});

export type CreateBucketParams = z.infer<typeof createBucketSchema>;

/**
 * Create bucket operation definition
 */
export const createBucketOperation: OperationDefinition = {
    id: "createBucket",
    name: "Create Bucket",
    description: "Create a new S3 bucket",
    category: "buckets",
    retryable: false,
    inputSchema: createBucketSchema
};

/**
 * Execute create bucket operation
 */
export async function executeCreateBucket(
    client: AWSS3Client,
    params: CreateBucketParams
): Promise<OperationResult> {
    try {
        await client.createBucket({ bucket: params.bucket });

        return {
            success: true,
            data: {
                bucket: params.bucket,
                created: true
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create bucket";
        const isConflict =
            message.includes("BucketAlreadyExists") || message.includes("BucketAlreadyOwnedByYou");

        return {
            success: false,
            error: {
                type: isConflict ? "validation" : "server_error",
                message,
                retryable: !isConflict
            }
        };
    }
}
