import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Connection } from "snowflake-sdk";

/**
 * List Tables operation schema
 */
export const listTablesSchema = z.object({
    schema: z.string().optional().default("PUBLIC").describe("Schema name (defaults to PUBLIC)"),
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
    description: "List all tables in a schema",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    conn: Connection,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const schemaName = params.schema || "PUBLIC";
        const dbPrefix = params.database ? `${params.database}.` : "";
        const sqlText = `SHOW TABLES IN SCHEMA ${dbPrefix}${schemaName}`;

        const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
            conn.execute({
                sqlText,
                complete: (err, _stmt, resultRows) => {
                    if (err) reject(err);
                    else resolve((resultRows as Record<string, unknown>[]) || []);
                }
            });
        });

        return {
            success: true,
            data: {
                tables: rows.map((row) => row.name as string)
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
