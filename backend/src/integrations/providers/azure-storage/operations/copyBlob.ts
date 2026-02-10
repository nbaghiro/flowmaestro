import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Copy blob input schema
 */
export const copyBlobSchema = z.object({
    sourceContainer: z.string().min(3).max(63).describe("Source container name"),
    sourceBlob: z.string().min(1).max(1024).describe("Source blob name"),
    destinationContainer: z.string().min(3).max(63).describe("Destination container name"),
    destinationBlob: z.string().min(1).max(1024).describe("Destination blob name"),
    metadata: z.record(z.string()).optional().describe("Custom metadata for the copied blob")
});

export type CopyBlobParams = z.infer<typeof copyBlobSchema>;

/**
 * Copy blob operation definition
 */
export const copyBlobOperation: OperationDefinition = {
    id: "copyBlob",
    name: "Copy Blob",
    description: "Copy a blob within or between containers",
    category: "blobs",
    retryable: true,
    inputSchema: copyBlobSchema
};

/**
 * Execute copy blob operation
 */
export async function executeCopyBlob(
    client: AzureStorageClient,
    params: CopyBlobParams
): Promise<OperationResult> {
    try {
        const response = await client.copyBlob({
            sourceContainer: params.sourceContainer,
            sourceBlob: params.sourceBlob,
            destinationContainer: params.destinationContainer,
            destinationBlob: params.destinationBlob,
            metadata: params.metadata
        });

        return {
            success: true,
            data: {
                sourceContainer: params.sourceContainer,
                sourceBlob: params.sourceBlob,
                destinationContainer: params.destinationContainer,
                destinationBlob: params.destinationBlob,
                copyId: response.copyId,
                copyStatus: response.copyStatus
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to copy blob";
        const isNotFound =
            message.includes("BlobNotFound") || message.includes("ContainerNotFound");

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
