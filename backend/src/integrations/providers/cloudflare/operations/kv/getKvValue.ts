import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Get KV Value operation schema
 */
export const getKvValueSchema = z.object({
    namespaceId: KVNamespaceIdSchema,
    key: z.string().min(1).max(512).describe("The key to retrieve")
});

export type GetKvValueParams = z.infer<typeof getKvValueSchema>;

/**
 * Get KV Value operation definition
 */
export const getKvValueOperation: OperationDefinition = {
    id: "kv_getValue",
    name: "Get KV Value",
    description: "Get the value for a key in a KV namespace",
    category: "kv",
    inputSchema: getKvValueSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get KV value operation
 */
export async function executeGetKvValue(
    client: CloudflareClient,
    params: GetKvValueParams
): Promise<OperationResult> {
    try {
        const value = await client.getKVValue(params.namespaceId, params.key);

        return {
            success: true,
            data: {
                key: params.key,
                value,
                namespaceId: params.namespaceId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get KV value",
                retryable: true
            }
        };
    }
}
