import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RedshiftClient } from "../client/RedshiftClient";

/**
 * Insert operation schema
 */
export const insertSchema = z.object({
    table: z.string().min(1).describe("Table name to insert into"),
    columns: z.array(z.string()).min(1).describe("Column names to insert into"),
    values: z.array(z.array(z.unknown())).min(1).describe("Array of value arrays to insert"),
    schema: z.string().optional().default("public").describe("Schema name containing the table")
});

export type InsertParams = z.infer<typeof insertSchema>;

/**
 * Insert operation definition
 */
export const insertOperation: OperationDefinition = {
    id: "insert",
    name: "Insert Data",
    description: "Insert rows into a Redshift table",
    category: "database",
    inputSchema: insertSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute insert operation
 */
export async function executeInsert(
    client: RedshiftClient,
    params: InsertParams
): Promise<OperationResult> {
    try {
        // Build the INSERT statement
        const columnList = params.columns.map((col) => `"${col}"`).join(", ");

        // Format values for SQL
        const valueRows = params.values.map((row) => {
            const formattedValues = row.map((val) => formatValue(val));
            return `(${formattedValues.join(", ")})`;
        });

        const tableName = `"${params.schema}"."${params.table}"`;
        const sql = `INSERT INTO ${tableName} (${columnList}) VALUES ${valueRows.join(", ")}`;

        const result = await client.executeModification(sql);

        return {
            success: true,
            data: {
                rowsAffected: result.rowsAffected,
                insertedCount: params.values.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Insert failed";

        return {
            success: false,
            error: {
                type:
                    message.includes("does not exist") || message.includes("not found")
                        ? "not_found"
                        : message.includes("permission")
                          ? "permission"
                          : message.includes("syntax") ||
                              message.includes("invalid") ||
                              message.includes("type")
                            ? "validation"
                            : "server_error",
                message,
                retryable: false
            }
        };
    }
}

/**
 * Format a value for SQL
 */
function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "NULL";
    }
    if (typeof value === "string") {
        // Escape single quotes
        return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (value instanceof Date) {
        return `'${value.toISOString()}'`;
    }
    if (Array.isArray(value) || typeof value === "object") {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    return String(value);
}
