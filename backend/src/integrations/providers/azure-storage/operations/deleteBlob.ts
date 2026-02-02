import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Delete blob input schema
 */
export const deleteBlobSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)")
});

export type DeleteBlobParams = z.infer<typeof deleteBlobSchema>;

/**
 * Delete blob operation definition
 */
export const deleteBlobOperation: OperationDefinition = {
    id: "deleteBlob",
    name: "Delete Blob",
    description: "Delete a blob from a container",
    category: "blobs",
    retryable: false,
    inputSchema: deleteBlobSchema
};

/**
 * Execute delete blob operation
 */
export async function executeDeleteBlob(
    client: AzureStorageClient,
    params: DeleteBlobParams
): Promise<OperationResult> {
    try {
        await client.deleteBlob({
            container: params.container,
            blob: params.blob
        });

        return {
            success: true,
            data: {
                deleted: true,
                container: params.container,
                blob: params.blob
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete blob";

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
