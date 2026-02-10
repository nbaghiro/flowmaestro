import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, ResultSetHeader } from "mysql2/promise";

/**
 * Insert operation schema
 */
export const insertSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z.record(z.any()).describe("Data to insert as key-value pairs"),
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
        const placeholders = values.map(() => "?").join(", ");

        const query = `INSERT INTO ${params.table} (${columns.join(", ")}) VALUES (${placeholders})`;

        const [result] = await pool.query<ResultSetHeader>(query, values);

        return {
            success: true,
            data: {
                inserted: result.affectedRows,
                insertId: result.insertId
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
