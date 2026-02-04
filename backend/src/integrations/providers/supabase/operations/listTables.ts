import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

/**
 * List Tables operation schema
 */
export const listTablesSchema = z.object({
    schema: z
        .string()
        .optional()
        .default("public")
        .describe("Database schema name (PostgREST exposes the configured schema)"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

/**
 * List Tables operation definition
 */
export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables available through the Supabase REST API",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 5000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    client: SupabaseClient,
    _params: ListTablesParams
): Promise<OperationResult> {
    try {
        const tables = await client.listTables();

        return {
            success: true,
            data: {
                tables
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tables",
                retryable: true
            }
        };
    }
}
