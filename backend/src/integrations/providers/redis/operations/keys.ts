import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Keys operation schema
 */
export const keysSchema = z.object({
    pattern: z.string().default("*").describe("Glob pattern to match keys"),
    count: z
        .number()
        .int()
        .positive()
        .max(10000)
        .default(100)
        .describe("Approximate number of keys to return per SCAN iteration")
});

export type KeysParams = z.infer<typeof keysSchema>;

/**
 * Keys operation definition
 */
export const keysOperation: OperationDefinition = {
    id: "keys",
    name: "Scan Keys",
    description: "Scan keys matching a glob pattern using SCAN (production-safe)",
    category: "keys",
    inputSchema: keysSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute keys operation using SCAN (not KEYS, which blocks in production)
 */
export async function executeKeys(client: Redis, params: KeysParams): Promise<OperationResult> {
    try {
        const keys: string[] = [];
        const stream = client.scanStream({
            match: params.pattern,
            count: params.count
        });

        return new Promise<OperationResult>((resolve) => {
            stream.on("data", (batch: string[]) => {
                keys.push(...batch);
            });

            stream.on("end", () => {
                resolve({
                    success: true,
                    data: {
                        keys,
                        total: keys.length
                    }
                });
            });

            stream.on("error", (error: Error) => {
                resolve({
                    success: false,
                    error: {
                        type: "server_error",
                        message: error.message || "Failed to scan keys",
                        retryable: false
                    }
                });
            });
        });
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to scan keys",
                retryable: false
            }
        };
    }
}
