import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Set operation schema
 */
export const setSchema = z.object({
    key: z.string().min(1).describe("Key to set"),
    value: z.string().describe("Value to store"),
    ttl: z.number().int().positive().optional().describe("Time to live in seconds"),
    condition: z
        .enum(["NX", "XX"])
        .optional()
        .describe("NX = only set if not exists, XX = only set if exists")
});

export type SetParams = z.infer<typeof setSchema>;

/**
 * Set operation definition
 */
export const setOperation: OperationDefinition = {
    id: "set",
    name: "Set Value",
    description: "Set key-value pair with optional TTL and NX/XX condition",
    category: "strings",
    inputSchema: setSchema,
    retryable: false,
    timeout: 5000
};

/**
 * Execute set operation
 */
export async function executeSet(client: Redis, params: SetParams): Promise<OperationResult> {
    try {
        let result: string | null;

        if (params.ttl && params.condition === "NX") {
            result = await client.set(params.key, params.value, "EX", params.ttl, "NX");
        } else if (params.ttl && params.condition === "XX") {
            result = await client.set(params.key, params.value, "EX", params.ttl, "XX");
        } else if (params.ttl) {
            result = await client.set(params.key, params.value, "EX", params.ttl);
        } else if (params.condition === "NX") {
            result = await client.set(params.key, params.value, "NX");
        } else if (params.condition === "XX") {
            result = await client.set(params.key, params.value, "XX");
        } else {
            result = await client.set(params.key, params.value);
        }

        return {
            success: true,
            data: {
                set: result === "OK"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set value",
                retryable: false
            }
        };
    }
}
