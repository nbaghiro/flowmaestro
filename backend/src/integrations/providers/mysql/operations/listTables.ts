import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, RowDataPacket } from "mysql2/promise";

/**
 * List Tables operation schema
 */
export const listTablesSchema = z.object({
    database: z.string().optional().describe("Database name (defaults to the connected database)"),
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
        let query: string;
        let queryParams: string[];

        if (params.database) {
            query = `
                SELECT TABLE_NAME as table_name
                FROM information_schema.tables
                WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            `;
            queryParams = [params.database];
        } else {
            query = `
                SELECT TABLE_NAME as table_name
                FROM information_schema.tables
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            `;
            queryParams = [];
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);

        return {
            success: true,
            data: {
                tables: rows.map((row) => row.table_name)
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
