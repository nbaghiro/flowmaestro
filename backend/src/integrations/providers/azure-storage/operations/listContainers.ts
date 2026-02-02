import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * List containers input schema
 */
export const listContainersSchema = z.object({
    prefix: z.string().optional().describe("Filter containers by name prefix"),
    maxResults: z
        .number()
        .min(1)
        .max(5000)
        .optional()
        .describe("Maximum number of containers to return"),
    marker: z.string().optional().describe("Continuation marker for pagination")
});

export type ListContainersParams = z.infer<typeof listContainersSchema>;

/**
 * List containers operation definition
 */
export const listContainersOperation: OperationDefinition = {
    id: "listContainers",
    name: "List Containers",
    description: "List all blob containers in the storage account",
    category: "containers",
    retryable: true,
    inputSchema: listContainersSchema
};

/**
 * Execute list containers operation
 */
export async function executeListContainers(
    client: AzureStorageClient,
    params: ListContainersParams
): Promise<OperationResult> {
    try {
        const response = await client.listContainers({
            prefix: params.prefix,
            maxResults: params.maxResults,
            marker: params.marker
        });

        return {
            success: true,
            data: {
                containers: response.containers,
                nextMarker: response.nextMarker
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list containers",
                retryable: true
            }
        };
    }
}
