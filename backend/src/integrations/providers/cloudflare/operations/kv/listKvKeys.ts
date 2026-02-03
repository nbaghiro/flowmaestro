import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * List KV Keys operation schema
 */
export const listKvKeysSchema = z.object({
    namespaceId: KVNamespaceIdSchema,
    prefix: z.string().optional().describe("Filter keys by prefix"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of keys to return (default: 1000)"),
    cursor: z.string().optional().describe("Cursor for pagination")
});

export type ListKvKeysParams = z.infer<typeof listKvKeysSchema>;

/**
 * List KV Keys operation definition
 */
export const listKvKeysOperation: OperationDefinition = {
    id: "kv_listKeys",
    name: "List KV Keys",
    description: "List keys in a KV namespace",
    category: "kv",
    inputSchema: listKvKeysSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list KV keys operation
 */
export async function executeListKvKeys(
    client: CloudflareClient,
    params: ListKvKeysParams
): Promise<OperationResult> {
    try {
        const { namespaceId, ...queryParams } = params;
        const response = await client.listKVKeys(namespaceId, queryParams);

        return {
            success: true,
            data: {
                keys: response.keys.map((key) => ({
                    name: key.name,
                    expiration: key.expiration,
                    metadata: key.metadata
                })),
                cursor: response.cursor,
                namespaceId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list KV keys",
                retryable: true
            }
        };
    }
}
