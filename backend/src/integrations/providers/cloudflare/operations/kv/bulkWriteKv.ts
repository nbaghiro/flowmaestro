import { z } from "zod";
import { KVNamespaceIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Bulk Write KV operation schema
 */
export const bulkWriteKvSchema = z.object({
    namespaceId: KVNamespaceIdSchema,
    pairs: z
        .array(
            z.object({
                key: z.string().min(1).max(512).describe("The key to write"),
                value: z.string().describe("The value to store"),
                expiration: z
                    .number()
                    .int()
                    .optional()
                    .describe("Unix timestamp when the key should expire"),
                expiration_ttl: z
                    .number()
                    .int()
                    .min(60)
                    .optional()
                    .describe("Number of seconds until expiration (minimum 60)"),
                metadata: z
                    .record(z.unknown())
                    .optional()
                    .describe("Arbitrary JSON metadata to store with the key"),
                base64: z.boolean().optional().describe("Whether the value is base64-encoded")
            })
        )
        .min(1)
        .max(10000)
        .describe("Array of key-value pairs to write (max 10,000)")
});

export type BulkWriteKvParams = z.infer<typeof bulkWriteKvSchema>;

/**
 * Bulk Write KV operation definition
 */
export const bulkWriteKvOperation: OperationDefinition = {
    id: "kv_bulkWrite",
    name: "Bulk Write KV",
    description: "Write multiple key-value pairs to a KV namespace in a single request",
    category: "kv",
    inputSchema: bulkWriteKvSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute bulk write KV operation
 */
export async function executeBulkWriteKv(
    client: CloudflareClient,
    params: BulkWriteKvParams
): Promise<OperationResult> {
    try {
        await client.bulkWriteKV(params.namespaceId, params.pairs);

        return {
            success: true,
            data: {
                namespaceId: params.namespaceId,
                keysWritten: params.pairs.length,
                message: `Successfully wrote ${params.pairs.length} key-value pair(s)`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to bulk write KV pairs",
                retryable: false
            }
        };
    }
}
