import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Get operation schema
 */
export const getSchema = z.object({
    key: z.string().min(1).describe("Key to retrieve").optional(),
    keys: z.array(z.string().min(1)).min(1).describe("Multiple keys to retrieve").optional()
});

export type GetParams = z.infer<typeof getSchema>;

/**
 * Get operation definition
 */
export const getOperation: OperationDefinition = {
    id: "get",
    name: "Get Value",
    description: "Get value by key, or multiple values with MGET",
    category: "strings",
    inputSchema: getSchema,
    retryable: true,
    timeout: 5000
};

/**
 * Execute get operation
 */
export async function executeGet(client: Redis, params: GetParams): Promise<OperationResult> {
    try {
        if (!params.key && !params.keys) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either 'key' or 'keys' must be provided",
                    retryable: false
                }
            };
        }

        // Multi-key get
        if (params.keys) {
            const values = await client.mget(...params.keys);
            const result: Record<string, string | null> = {};
            params.keys.forEach((key, index) => {
                result[key] = values[index];
            });

            return {
                success: true,
                data: {
                    values: result
                }
            };
        }

        // Single key get
        const value = await client.get(params.key!);

        return {
            success: true,
            data: {
                value
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get value",
                retryable: false
            }
        };
    }
}
