import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Delete KV Key operation schema
 */
export const deleteKvKeySchema = z.object({
    namespaceId: KVNamespaceIdSchema,
    key: z.string().min(1).max(512).describe("The key to delete")
});

export type DeleteKvKeyParams = z.infer<typeof deleteKvKeySchema>;

/**
 * Delete KV Key operation definition
 */
export const deleteKvKeyOperation: OperationDefinition = {
    id: "kv_deleteKey",
    name: "Delete KV Key",
    description: "Delete a key from a KV namespace",
    category: "kv",
    inputSchema: deleteKvKeySchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete KV key operation
 */
export async function executeDeleteKvKey(
    client: CloudflareClient,
    params: DeleteKvKeyParams
): Promise<OperationResult> {
    try {
        await client.deleteKVKey(params.namespaceId, params.key);

        return {
            success: true,
            data: {
                key: params.key,
                namespaceId: params.namespaceId,
                message: "KV key deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete KV key",
                retryable: false
            }
        };
    }
}
