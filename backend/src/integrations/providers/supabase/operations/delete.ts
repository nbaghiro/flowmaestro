import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

const filterSchema = z.object({
    column: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()])
});

/**
 * Delete operation schema
 */
export const deleteSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    filter: z
        .array(filterSchema)
        .min(1)
        .describe(
            "Filter conditions to match rows (required to prevent accidental full-table deletes)"
        ),
    returning: z.boolean().optional().default(true).describe("Whether to return the deleted rows"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type DeleteParams = z.infer<typeof deleteSchema>;

/**
 * Delete operation definition
 */
export const deleteOperation: OperationDefinition = {
    id: "delete",
    name: "Delete Rows",
    description: "Delete rows from a Supabase table matching the given filters",
    category: "database",
    inputSchema: deleteSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete operation
 */
export async function executeDelete(
    client: SupabaseClient,
    params: DeleteParams
): Promise<OperationResult> {
    try {
        const result = await client.deleteRows(params.table, params.filter, params.returning);

        return {
            success: true,
            data: {
                deleted: result.count,
                rows: result.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete rows",
                retryable: false
            }
        };
    }
}
