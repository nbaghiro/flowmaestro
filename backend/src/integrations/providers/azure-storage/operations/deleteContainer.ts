import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Delete container input schema
 */
export const deleteContainerSchema = z.object({
    name: z.string().min(3).max(63).describe("Container name to delete")
});

export type DeleteContainerParams = z.infer<typeof deleteContainerSchema>;

/**
 * Delete container operation definition
 */
export const deleteContainerOperation: OperationDefinition = {
    id: "deleteContainer",
    name: "Delete Container",
    description: "Delete a blob container and all its contents",
    category: "containers",
    retryable: false,
    inputSchema: deleteContainerSchema
};

/**
 * Execute delete container operation
 */
export async function executeDeleteContainer(
    client: AzureStorageClient,
    params: DeleteContainerParams
): Promise<OperationResult> {
    try {
        await client.deleteContainer(params.name);

        return {
            success: true,
            data: {
                deleted: true,
                name: params.name
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete container";
        const isNotFound = message.includes("ContainerNotFound");

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
