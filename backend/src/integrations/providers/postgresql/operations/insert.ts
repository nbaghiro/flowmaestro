import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, QueryResult } from "pg";

/**
 * Insert operation schema
 */
export const insertSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z.record(z.any()).describe("Data to insert as key-value pairs"),
    returning: z
        .array(z.string())
        .optional()
        .describe("Columns to return (PostgreSQL RETURNING clause)"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type InsertParams = z.infer<typeof insertSchema>;

/**
 * Insert operation definition
 */
export const insertOperation: OperationDefinition = {
    id: "insert",
    name: "Insert Row",
    description: "Insert a new row into a table",
    category: "database",
    inputSchema: insertSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute insert operation
 */
export async function executeInsert(pool: Pool, params: InsertParams): Promise<OperationResult> {
    try {
        const columns = Object.keys(params.data);
        const values = Object.values(params.data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        let query = `INSERT INTO ${params.table} (${columns.join(", ")}) VALUES (${placeholders})`;

        if (params.returning && params.returning.length > 0) {
            query += ` RETURNING ${params.returning.join(", ")}`;
        }

        const result: QueryResult = await pool.query(query, values);

        return {
            success: true,
            data: {
                inserted: result.rowCount || 0,
                returning: params.returning ? result.rows : undefined
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to insert row",
                retryable: false
            }
        };
    }
}
