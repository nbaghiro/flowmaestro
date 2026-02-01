import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, QueryResult } from "pg";

/**
 * Delete operation schema
 */
export const deleteSchema = z.object({
    table: z.string().min(1).describe("Table name"),
    where: z.string().min(1).describe("WHERE clause (without the WHERE keyword)"),
    whereParameters: z.array(z.any()).optional().describe("Parameters for the WHERE clause"),
    returning: z
        .array(z.string())
        .optional()
        .describe("Columns to return (PostgreSQL RETURNING clause)"),
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
        let query = `DELETE FROM ${params.table} WHERE ${params.where}`;

        if (params.returning && params.returning.length > 0) {
            query += ` RETURNING ${params.returning.join(", ")}`;
        }

        const result: QueryResult = await pool.query(query, params.whereParameters || []);

        return {
            success: true,
            data: {
                deleted: result.rowCount || 0,
                returning: params.returning ? result.rows : undefined
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
