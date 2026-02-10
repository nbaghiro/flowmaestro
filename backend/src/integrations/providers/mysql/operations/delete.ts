import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, ResultSetHeader } from "mysql2/promise";

/**
 * Delete operation schema
 */
export const deleteSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    where: z.string().min(1).describe("WHERE clause (without the WHERE keyword)"),
    whereParameters: z.array(z.any()).optional().describe("Parameters for the WHERE clause"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type DeleteParams = z.infer<typeof deleteSchema>;

/**
 * Delete operation definition
 */
export const deleteOperation: OperationDefinition = {
    id: "delete",
    name: "Delete Rows",
    description: "Delete rows from a table",
    category: "database",
    inputSchema: deleteSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete operation
 */
export async function executeDelete(pool: Pool, params: DeleteParams): Promise<OperationResult> {
    try {
        const query = `DELETE FROM ${params.table} WHERE ${params.where}`;

        const [result] = await pool.query<ResultSetHeader>(query, params.whereParameters || []);

        return {
            success: true,
            data: {
                deleted: result.affectedRows
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
