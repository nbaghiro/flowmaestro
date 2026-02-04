import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Hash Set operation schema
 */
export const hashSetSchema = z.object({
    key: z.string().min(1).describe("Hash key"),
    fields: z.record(z.string()).describe("Field-value pairs to set on the hash")
});

export type HashSetParams = z.infer<typeof hashSetSchema>;

/**
 * Hash Set operation definition
 */
export const hashSetOperation: OperationDefinition = {
    id: "hashSet",
    name: "Set Hash Fields",
    description: "Set one or more fields on a hash",
    category: "hashes",
    inputSchema: hashSetSchema,
    retryable: false,
    timeout: 5000
};

/**
 * Execute hash set operation
 */
export async function executeHashSet(
    client: Redis,
    params: HashSetParams
): Promise<OperationResult> {
    try {
        const added = await client.hset(params.key, params.fields);

        return {
            success: true,
            data: {
                added
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set hash fields",
                retryable: false
            }
        };
    }
}
