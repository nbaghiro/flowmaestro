import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Delete KV Namespace operation schema
 */
export const deleteKvNamespaceSchema = z.object({
    namespaceId: KVNamespaceIdSchema.describe("The ID of the KV namespace to delete")
});

export type DeleteKvNamespaceParams = z.infer<typeof deleteKvNamespaceSchema>;

/**
 * Delete KV Namespace operation definition
 */
export const deleteKvNamespaceOperation: OperationDefinition = {
    id: "kv_deleteNamespace",
    name: "Delete KV Namespace",
    description: "Delete a KV namespace",
    category: "kv",
    inputSchema: deleteKvNamespaceSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete KV namespace operation
 */
export async function executeDeleteKvNamespace(
    client: CloudflareClient,
    params: DeleteKvNamespaceParams
): Promise<OperationResult> {
    try {
        await client.deleteKVNamespace(params.namespaceId);

        return {
            success: true,
            data: {
                namespaceId: params.namespaceId,
                message: "KV namespace deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete KV namespace",
                retryable: false
            }
        };
    }
}
