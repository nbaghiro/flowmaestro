import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SupabaseClient } from "../client/SupabaseClient";

const filterSchema = z.object({
    column: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()])
});

/**
 * Query operation schema
 */
export const querySchema = z.object({
    table: z.string().min(1).describe("Table name to query"),
    select: z
        .string()
        .optional()
        .default("*")
        .describe("Columns to select (PostgREST select syntax)"),
    filter: z.array(filterSchema).optional().default([]).describe("Array of filter conditions"),
    order: z
        .string()
        .optional()
        .describe("Order clause (e.g., 'name.asc', 'created_at.desc.nullslast')"),
    limit: z.number().int().positive().optional().describe("Maximum number of rows to return"),
    offset: z.number().int().min(0).optional().describe("Number of rows to skip"),
    single: z
        .boolean()
        .optional()
        .default(false)
        .describe("Return a single object instead of an array"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type QueryParams = z.infer<typeof querySchema>;

/**
 * Query operation definition
 */
export const queryOperation: OperationDefinition = {
    id: "query",
    name: "Query Rows",
    description:
        "Select rows from a Supabase table with optional filtering, ordering, and pagination",
    category: "database",
    inputSchema: querySchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute query operation
 */
export async function executeQuery(
    client: SupabaseClient,
    params: QueryParams
): Promise<OperationResult> {
    try {
        const result = await client.query(params.table, params.select, params.filter, {
            order: params.order,
            limit: params.limit,
            offset: params.offset,
            single: params.single
        });

        return {
            success: true,
            data: {
                rows: result.data,
                count: result.count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query rows",
                retryable: false
            }
        };
    }
}
