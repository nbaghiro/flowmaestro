import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * List Push operation schema
 */
export const listPushSchema = z.object({
    key: z.string().min(1).describe("List key"),
    values: z.array(z.string()).min(1).describe("Values to push"),
    direction: z
        .enum(["left", "right"])
        .default("right")
        .describe("Push to head (left/LPUSH) or tail (right/RPUSH)")
});

export type ListPushParams = z.infer<typeof listPushSchema>;

/**
 * List Push operation definition
 */
export const listPushOperation: OperationDefinition = {
    id: "listPush",
    name: "Push to List",
    description: "Push element(s) to head (LPUSH) or tail (RPUSH) of a list",
    category: "lists",
    inputSchema: listPushSchema,
    retryable: false,
    timeout: 5000
};

/**
 * Execute list push operation
 */
export async function executeListPush(
    client: Redis,
    params: ListPushParams
): Promise<OperationResult> {
    try {
        let length: number;

        if (params.direction === "left") {
            length = await client.lpush(params.key, ...params.values);
        } else {
            length = await client.rpush(params.key, ...params.values);
        }

        return {
            success: true,
            data: {
                length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to push to list",
                retryable: false
            }
        };
    }
}
