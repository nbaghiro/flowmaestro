import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * List Range operation schema
 */
export const listRangeSchema = z.object({
    key: z.string().min(1).describe("List key"),
    start: z.number().int().default(0).describe("Start index (0-based, supports negative)"),
    stop: z.number().int().default(-1).describe("Stop index (-1 = last element)")
});

export type ListRangeParams = z.infer<typeof listRangeSchema>;

/**
 * List Range operation definition
 */
export const listRangeOperation: OperationDefinition = {
    id: "listRange",
    name: "Get List Range",
    description: "Get elements from a list by index range (LRANGE)",
    category: "lists",
    inputSchema: listRangeSchema,
    retryable: true,
    timeout: 5000
};

/**
 * Execute list range operation
 */
export async function executeListRange(
    client: Redis,
    params: ListRangeParams
): Promise<OperationResult> {
    try {
        const values = await client.lrange(params.key, params.start, params.stop);

        return {
            success: true,
            data: {
                values,
                length: values.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get list range",
                retryable: false
            }
        };
    }
}
