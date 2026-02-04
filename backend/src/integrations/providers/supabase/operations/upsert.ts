import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

/**
 * Upsert operation schema
 */
export const upsertSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z
        .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
        .describe("Row data as object (single) or array of objects (batch)"),
    onConflict: z
        .string()
        .optional()
        .describe(
            "Comma-separated column names for conflict resolution (e.g., 'id' or 'email,tenant_id')"
        ),
    returning: z.boolean().optional().default(true).describe("Whether to return the upserted rows"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type UpsertParams = z.infer<typeof upsertSchema>;

/**
 * Upsert operation definition
 */
export const upsertOperation: OperationDefinition = {
    id: "upsert",
    name: "Upsert Rows",
    description: "Insert rows or update on conflict (merge duplicates) in a Supabase table",
    category: "database",
    inputSchema: upsertSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute upsert operation
 */
export async function executeUpsert(
    client: SupabaseClient,
    params: UpsertParams
): Promise<OperationResult> {
    try {
        const result = await client.insert(params.table, params.data, {
            returning: params.returning,
            upsert: true,
            onConflict: params.onConflict
        });

        return {
            success: true,
            data: {
                upserted: result.count,
                rows: result.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to upsert rows",
                retryable: false
            }
        };
    }
}
