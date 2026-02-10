import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Create container input schema
 */
export const createContainerSchema = z.object({
    name: z
        .string()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
            "Container name must be lowercase letters, numbers, and hyphens"
        )
        .describe("Container name"),
    publicAccess: z
        .enum(["container", "blob"])
        .optional()
        .describe("Public access level (container or blob)")
});

export type CreateContainerParams = z.infer<typeof createContainerSchema>;

/**
 * Create container operation definition
 */
export const createContainerOperation: OperationDefinition = {
    id: "createContainer",
    name: "Create Container",
    description: "Create a new blob container",
    category: "containers",
    retryable: false,
    inputSchema: createContainerSchema
};

/**
 * Execute create container operation
 */
export async function executeCreateContainer(
    client: AzureStorageClient,
    params: CreateContainerParams
): Promise<OperationResult> {
    try {
        await client.createContainer(params.name, params.publicAccess);

        return {
            success: true,
            data: {
                name: params.name,
                created: true,
                publicAccess: params.publicAccess
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create container";
        const isConflict = message.includes("ContainerAlreadyExists");

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
