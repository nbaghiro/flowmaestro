import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

/**
 * Insert operation schema
 */
export const insertSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z
        .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
        .describe("Row data as object (single) or array of objects (batch)"),
    returning: z.boolean().optional().default(true).describe("Whether to return the inserted rows"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type InsertParams = z.infer<typeof insertSchema>;

/**
 * Insert operation definition
 */
export const insertOperation: OperationDefinition = {
    id: "insert",
    name: "Insert Rows",
    description: "Insert one or more rows into a Supabase table",
    category: "database",
    inputSchema: insertSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute insert operation
 */
export async function executeInsert(
    client: SupabaseClient,
    params: InsertParams
): Promise<OperationResult> {
    try {
        const result = await client.insert(params.table, params.data, {
            returning: params.returning
        });

        return {
            success: true,
            data: {
                inserted: result.count,
                rows: result.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to insert rows",
                retryable: false
            }
        };
    }
}
