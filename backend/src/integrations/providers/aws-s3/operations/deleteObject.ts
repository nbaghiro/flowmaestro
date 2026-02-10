import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Delete object input schema
 */
export const deleteObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    key: z.string().min(1).max(1024).describe("Object key (path in bucket)")
});

export type DeleteObjectParams = z.infer<typeof deleteObjectSchema>;

/**
 * Delete object operation definition
 */
export const deleteObjectOperation: OperationDefinition = {
    id: "deleteObject",
    name: "Delete Object",
    description: "Delete an object from an S3 bucket",
    category: "objects",
    retryable: false,
    inputSchema: deleteObjectSchema
};

/**
 * Execute delete object operation
 */
export async function executeDeleteObject(
    client: AWSS3Client,
    params: DeleteObjectParams
): Promise<OperationResult> {
    try {
        await client.deleteObject({
            bucket: params.bucket,
            key: params.key
        });

        return {
            success: true,
            data: {
                deleted: true,
                bucket: params.bucket,
                key: params.key
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete object";

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
