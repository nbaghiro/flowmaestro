import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, ResultSetHeader } from "mysql2/promise";

/**
 * Update operation schema
 */
export const updateSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    data: z.record(z.any()).describe("Data to update as key-value pairs"),
    where: z.string().min(1).describe("WHERE clause (without the WHERE keyword)"),
    whereParameters: z.array(z.any()).optional().describe("Parameters for the WHERE clause"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type UpdateParams = z.infer<typeof updateSchema>;

/**
 * Update operation definition
 */
export const updateOperation: OperationDefinition = {
    id: "update",
    name: "Update Rows",
    description: "Update rows in a table",
    category: "database",
    inputSchema: updateSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute update operation
 */
export async function executeUpdate(pool: Pool, params: UpdateParams): Promise<OperationResult> {
    try {
        const columns = Object.keys(params.data);
        const values = Object.values(params.data);

        const setClause = columns.map((col) => `${col} = ?`).join(", ");

        const query = `UPDATE ${params.table} SET ${setClause} WHERE ${params.where}`;

        const queryParams = [...values, ...(params.whereParameters || [])];
        const [result] = await pool.query<ResultSetHeader>(query, queryParams);

        return {
            success: true,
            data: {
                updated: result.affectedRows
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
