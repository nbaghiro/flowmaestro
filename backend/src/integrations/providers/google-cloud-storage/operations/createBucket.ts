import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Create bucket input schema
 */
export const createBucketSchema = z.object({
    name: z
        .string()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/,
            "Bucket name must be lowercase, start/end with letter or number"
        )
        .describe("Globally unique bucket name"),
    location: z
        .string()
        .optional()
        .default("US")
        .describe("Bucket location (e.g., US, EU, ASIA, us-central1)"),
    storageClass: z
        .enum(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"])
        .optional()
        .default("STANDARD")
        .describe("Storage class for the bucket")
});

export type CreateBucketParams = z.infer<typeof createBucketSchema>;

/**
 * Create bucket operation definition
 */
export const createBucketOperation: OperationDefinition = {
    id: "createBucket",
    name: "Create Bucket",
    description: "Create a new Cloud Storage bucket",
    category: "buckets",
    retryable: false,
    inputSchema: createBucketSchema
};

/**
 * Execute create bucket operation
 */
export async function executeCreateBucket(
    client: GoogleCloudStorageClient,
    params: CreateBucketParams
): Promise<OperationResult> {
    try {
        const response = await client.createBucket({
            name: params.name,
            location: params.location,
            storageClass: params.storageClass
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create bucket";
        const isConflict = message.includes("Conflict") || message.includes("already exists");

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
