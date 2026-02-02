import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * List blobs input schema
 */
export const listBlobsSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    prefix: z.string().optional().describe("Filter blobs by name prefix (virtual folder path)"),
    delimiter: z.string().optional().describe("Delimiter for hierarchy (typically '/')"),
    maxResults: z
        .number()
        .min(1)
        .max(5000)
        .optional()
        .describe("Maximum number of blobs to return"),
    marker: z.string().optional().describe("Continuation marker for pagination")
});

export type ListBlobsParams = z.infer<typeof listBlobsSchema>;

/**
 * List blobs operation definition
 */
export const listBlobsOperation: OperationDefinition = {
    id: "listBlobs",
    name: "List Blobs",
    description: "List blobs in a container with optional prefix filtering",
    category: "blobs",
    retryable: true,
    inputSchema: listBlobsSchema
};

/**
 * Execute list blobs operation
 */
export async function executeListBlobs(
    client: AzureStorageClient,
    params: ListBlobsParams
): Promise<OperationResult> {
    try {
        const response = await client.listBlobs({
            container: params.container,
            prefix: params.prefix,
            delimiter: params.delimiter,
            maxResults: params.maxResults,
            marker: params.marker
        });

        return {
            success: true,
            data: {
                blobs: response.blobs,
                blobPrefixes: response.blobPrefixes,
                nextMarker: response.nextMarker
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list blobs";
        const isNotFound = message.includes("ContainerNotFound");

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
