import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Hash Get operation schema
 */
export const hashGetSchema = z.object({
    key: z.string().min(1).describe("Hash key"),
    fields: z
        .array(z.string().min(1))
        .optional()
        .describe("Specific fields to get. Omit to get all fields (HGETALL)")
});

export type HashGetParams = z.infer<typeof hashGetSchema>;

/**
 * Hash Get operation definition
 */
export const hashGetOperation: OperationDefinition = {
    id: "hashGet",
    name: "Get Hash Fields",
    description: "Get specific fields or all fields from a hash",
    category: "hashes",
    inputSchema: hashGetSchema,
    retryable: true,
    timeout: 5000
};

/**
 * Execute hash get operation
 */
export async function executeHashGet(
    client: Redis,
    params: HashGetParams
): Promise<OperationResult> {
    try {
        if (params.fields && params.fields.length > 0) {
            // Get specific fields
            const values = await client.hmget(params.key, ...params.fields);
            const fields: Record<string, string | null> = {};
            params.fields.forEach((field, index) => {
                fields[field] = values[index];
            });

            return {
                success: true,
                data: {
                    fields
                }
            };
        }

        // Get all fields
        const allFields = await client.hgetall(params.key);

        return {
            success: true,
            data: {
                fields: allFields
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get hash fields",
                retryable: false
            }
        };
    }
}
