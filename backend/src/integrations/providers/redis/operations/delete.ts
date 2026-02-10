import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type Redis from "ioredis";

/**
 * Delete operation schema
 */
export const deleteSchema = z.object({
    keys: z.array(z.string().min(1)).min(1).describe("Keys to delete")
});

export type DeleteParams = z.infer<typeof deleteSchema>;

/**
 * Delete operation definition
 */
export const deleteOperation: OperationDefinition = {
    id: "delete",
    name: "Delete Keys",
    description: "Delete one or more keys",
    category: "keys",
    inputSchema: deleteSchema,
    retryable: false,
    timeout: 5000
};

/**
 * Execute delete operation
 */
export async function executeDelete(client: Redis, params: DeleteParams): Promise<OperationResult> {
    try {
        const deleted = await client.del(...params.keys);

        return {
            success: true,
            data: {
                deleted
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete keys",
                retryable: false
            }
        };
    }
}
