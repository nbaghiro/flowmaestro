import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Create index operation schema
 */
export const createIndexSchema = z.object({
    index: z.string().min(1).describe("Index name to create"),
    settings: z
        .record(z.unknown())
        .optional()
        .describe("Index settings (e.g., number_of_shards, number_of_replicas)"),
    mappings: z
        .record(z.unknown())
        .optional()
        .describe("Index mappings defining field types and properties")
});

export type CreateIndexParams = z.infer<typeof createIndexSchema>;

/**
 * Create index operation definition
 */
export const createIndexOperation: OperationDefinition = {
    id: "createIndex",
    name: "Create Index",
    description: "Create a new index with optional settings and mappings",
    category: "database",
    inputSchema: createIndexSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create index operation
 */
export async function executeCreateIndex(
    client: ElasticsearchClient,
    params: CreateIndexParams
): Promise<OperationResult> {
    try {
        const response = await client.createIndex(params.index, params.settings, params.mappings);

        return {
            success: true,
            data: {
                index: response.index,
                acknowledged: response.acknowledged,
                shards_acknowledged: response.shards_acknowledged
            }
        };
    } catch (error) {
        return mapError(error, params.index);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown, index: string): OperationResult {
    const message = error instanceof Error ? error.message : "Create index failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 400 && message.includes("already exists")) {
        return {
            success: false,
            error: {
                type: "validation",
                message: `Index '${index}' already exists`,
                retryable: false
            }
        };
    }

    let type: "validation" | "server_error" = "server_error";
    let retryable = false;

    if (statusCode === 400) {
        type = "validation";
    } else if (statusCode === 503 || statusCode === 429) {
        retryable = true;
    }

    return {
        success: false,
        error: { type, message, retryable }
    };
}
