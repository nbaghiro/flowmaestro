import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

/**
 * RPC operation schema
 */
export const rpcSchema = z.object({
    functionName: z.string().min(1).describe("Name of the PostgreSQL function to call"),
    params: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe("Parameters to pass to the function as a JSON object"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type RpcParams = z.infer<typeof rpcSchema>;

/**
 * RPC operation definition
 */
export const rpcOperation: OperationDefinition = {
    id: "rpc",
    name: "Call RPC Function",
    description: "Call a PostgreSQL function via Supabase RPC endpoint",
    category: "database",
    inputSchema: rpcSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute RPC operation
 */
export async function executeRpc(
    client: SupabaseClient,
    params: RpcParams
): Promise<OperationResult> {
    try {
        const result = await client.rpc(params.functionName, params.params);

        return {
            success: true,
            data: {
                result
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to execute RPC function",
                retryable: false
            }
        };
    }
}
