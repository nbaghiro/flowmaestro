import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Put KV Value operation schema
 */
export const putKvValueSchema = z.object({
    namespaceId: KVNamespaceIdSchema,
    key: z.string().min(1).max(512).describe("The key to write"),
    value: z.string().describe("The value to store"),
    expiration: z.number().int().optional().describe("Unix timestamp when the key should expire"),
    expirationTtl: z
        .number()
        .int()
        .min(60)
        .optional()
        .describe("Number of seconds until expiration (minimum 60)"),
    metadata: z
        .record(z.unknown())
        .optional()
        .describe("Arbitrary JSON metadata to store with the key")
});

export type PutKvValueParams = z.infer<typeof putKvValueSchema>;

/**
 * Put KV Value operation definition
 */
export const putKvValueOperation: OperationDefinition = {
    id: "kv_putValue",
    name: "Put KV Value",
    description: "Write a value to a key in a KV namespace",
    category: "kv",
    inputSchema: putKvValueSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute put KV value operation
 */
export async function executePutKvValue(
    client: CloudflareClient,
    params: PutKvValueParams
): Promise<OperationResult> {
    try {
        await client.putKVValue(params.namespaceId, params.key, params.value, {
            expiration: params.expiration,
            expiration_ttl: params.expirationTtl,
            metadata: params.metadata
        });

        return {
            success: true,
            data: {
                key: params.key,
                namespaceId: params.namespaceId,
                message: "KV value written successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to put KV value",
                retryable: false
            }
        };
    }
}
