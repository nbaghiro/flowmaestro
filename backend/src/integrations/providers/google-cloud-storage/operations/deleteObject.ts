import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Delete object input schema
 */
export const deleteObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    object: z.string().min(1).max(1024).describe("Object name (path in bucket)")
});

export type DeleteObjectParams = z.infer<typeof deleteObjectSchema>;

/**
 * Delete object operation definition
 */
export const deleteObjectOperation: OperationDefinition = {
    id: "deleteObject",
    name: "Delete Object",
    description: "Delete an object from a Cloud Storage bucket",
    category: "objects",
    retryable: false,
    inputSchema: deleteObjectSchema
};

/**
 * Execute delete object operation
 */
export async function executeDeleteObject(
    client: GoogleCloudStorageClient,
    params: DeleteObjectParams
): Promise<OperationResult> {
    try {
        await client.deleteObject(params.bucket, params.object);

        return {
            success: true,
            data: {
                deleted: true,
                bucket: params.bucket,
                object: params.object
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete object";
        const isNotFound = message.includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
