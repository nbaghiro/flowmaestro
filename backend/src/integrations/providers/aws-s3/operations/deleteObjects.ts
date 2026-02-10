import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Delete multiple objects input schema
 */
export const deleteObjectsSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    keys: z
        .array(z.string().min(1).max(1024))
        .min(1)
        .max(1000)
        .describe("Array of object keys to delete")
});

export type DeleteObjectsParams = z.infer<typeof deleteObjectsSchema>;

/**
 * Delete multiple objects operation definition
 */
export const deleteObjectsOperation: OperationDefinition = {
    id: "deleteObjects",
    name: "Delete Multiple Objects",
    description: "Delete multiple objects from an S3 bucket in a single request",
    category: "objects",
    retryable: false,
    inputSchema: deleteObjectsSchema
};

/**
 * Execute delete multiple objects operation
 */
export async function executeDeleteObjects(
    client: AWSS3Client,
    params: DeleteObjectsParams
): Promise<OperationResult> {
    try {
        const response = await client.deleteObjects({
            bucket: params.bucket,
            keys: params.keys
        });

        return {
            success: true,
            data: {
                deleted: response.deleted,
                errors: response.errors,
                deletedCount: response.deleted.length,
                errorCount: response.errors.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete objects";

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
