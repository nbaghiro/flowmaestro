import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Binds, Connection } from "snowflake-sdk";

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
    retryable: false,
    timeout: 30000
};

/**
 * Execute insert operation
 */
export async function executeInsert(
    conn: Connection,
    params: InsertParams
): Promise<OperationResult> {
    try {
        const columns = Object.keys(params.data);
        const values = Object.values(params.data);
        const placeholders = values.map(() => "?").join(", ");

        const query = `INSERT INTO ${params.table} (${columns.join(", ")}) VALUES (${placeholders})`;

        const inserted = await new Promise<number>((resolve, reject) => {
            conn.execute({
                sqlText: query,
                binds: values as Binds,
                complete: (err, stmt) => {
                    if (err) reject(err);
                    else resolve(stmt.getNumUpdatedRows() ?? 0);
                }
            });
        });

        return {
            success: true,
            data: {
                inserted
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
