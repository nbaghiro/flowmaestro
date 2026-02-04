import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

const filterSchema = z.object({
    column: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()])
});

/**
 * Update operation schema
 */
export const updateSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z.record(z.unknown()).describe("Data to update as key-value pairs"),
    filter: z
        .array(filterSchema)
        .min(1)
        .describe(
            "Filter conditions to match rows (required to prevent accidental full-table updates)"
        ),
    returning: z.boolean().optional().default(true).describe("Whether to return the updated rows"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type UpdateParams = z.infer<typeof updateSchema>;

/**
 * Update operation definition
 */
export const updateOperation: OperationDefinition = {
    id: "update",
    name: "Update Rows",
    description: "Update rows in a Supabase table matching the given filters",
    category: "database",
    inputSchema: updateSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute update operation
 */
export async function executeUpdate(
    client: SupabaseClient,
    params: UpdateParams
): Promise<OperationResult> {
    try {
        const result = await client.update(
            params.table,
            params.data,
            params.filter,
            params.returning
        );

        return {
            success: true,
            data: {
                updated: result.count,
                rows: result.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update rows",
                retryable: false
            }
        };
    }
}
