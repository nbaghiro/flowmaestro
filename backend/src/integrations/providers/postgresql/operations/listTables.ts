import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, QueryResult } from "pg";

/**
 * List Tables operation schema
 */
export const listTablesSchema = z.object({
    schema: z.string().optional().default("public").describe("Database schema name"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

/**
 * List Tables operation definition
 */
export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables in the database",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 5000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    pool: Pool,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const query = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1 AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;

        const result: QueryResult = await pool.query(query, [params.schema]);

        return {
            success: true,
            data: {
                tables: result.rows.map((row) => row.table_name)
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
