import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Get object metadata input schema
 */
export const getObjectMetadataSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    object: z.string().min(1).max(1024).describe("Object name (path in bucket)")
});

export type GetObjectMetadataParams = z.infer<typeof getObjectMetadataSchema>;

/**
 * Get object metadata operation definition
 */
export const getObjectMetadataOperation: OperationDefinition = {
    id: "getObjectMetadata",
    name: "Get Object Metadata",
    description: "Get metadata for an object in a Cloud Storage bucket",
    category: "objects",
    retryable: true,
    inputSchema: getObjectMetadataSchema
};

/**
 * Execute get object metadata operation
 */
export async function executeGetObjectMetadata(
    client: GoogleCloudStorageClient,
    params: GetObjectMetadataParams
): Promise<OperationResult> {
    try {
        const response = await client.getObjectMetadata(params.bucket, params.object);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get object metadata";
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
