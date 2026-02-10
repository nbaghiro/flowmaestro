import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Create KV Namespace operation schema
 */
export const createKvNamespaceSchema = z.object({
    title: z.string().min(1).max(512).describe("A human-readable name for the namespace")
});

export type CreateKvNamespaceParams = z.infer<typeof createKvNamespaceSchema>;

/**
 * Create KV Namespace operation definition
 */
export const createKvNamespaceOperation: OperationDefinition = {
    id: "kv_createNamespace",
    name: "Create KV Namespace",
    description: "Create a new KV namespace",
    category: "kv",
    inputSchema: createKvNamespaceSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create KV namespace operation
 */
export async function executeCreateKvNamespace(
    client: CloudflareClient,
    params: CreateKvNamespaceParams
): Promise<OperationResult> {
    try {
        const namespace = await client.createKVNamespace(params.title);

        return {
            success: true,
            data: {
                id: namespace.id,
                title: namespace.title,
                supportsUrlEncoding: namespace.supports_url_encoding,
                message: "KV namespace created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create KV namespace",
                retryable: false
            }
        };
    }
}
