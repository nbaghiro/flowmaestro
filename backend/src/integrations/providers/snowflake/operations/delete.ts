import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Binds, Connection } from "snowflake-sdk";

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
    timeout: 30000
};

/**
 * Execute delete operation
 */
export async function executeDelete(
    conn: Connection,
    params: DeleteParams
): Promise<OperationResult> {
    try {
        const query = `DELETE FROM ${params.table} WHERE ${params.where}`;

        const deleted = await new Promise<number>((resolve, reject) => {
            conn.execute({
                sqlText: query,
                binds: (params.whereParameters || []) as Binds,
                complete: (err, stmt) => {
                    if (err) reject(err);
                    else resolve(stmt.getNumUpdatedRows() ?? 0);
                }
            });
        });

        return {
            success: true,
            data: {
                deleted
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
