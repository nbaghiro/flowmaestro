import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatabricksClient } from "../client/DatabricksClient";

/**
 * Update operation schema
 */
export const updateSchema = z.object({
    table: z.string().min(1).describe("Full table name (catalog.schema.table or just table name)"),
    set: z
        .record(z.string(), z.unknown())
        .refine((obj) => Object.keys(obj).length > 0, {
            message: "At least one column-value pair is required"
        })
        .describe("Column-value pairs to update"),
    where: z.string().optional().describe("WHERE clause condition (without WHERE keyword)"),
    catalog: z.string().optional().describe("Catalog name (overrides connection default)"),
    schema: z.string().optional().describe("Schema name (overrides connection default)")
});

export type UpdateParams = z.infer<typeof updateSchema>;

/**
 * Update operation definition
 */
export const updateOperation: OperationDefinition = {
    id: "update",
    name: "Update Data",
    description: "Update rows in a table",
    category: "database",
    inputSchema: updateSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute update operation
 */
export async function executeUpdate(
    client: DatabricksClient,
    params: UpdateParams
): Promise<OperationResult> {
    try {
        // Build the SET clause
        const setClauses = Object.entries(params.set).map(([column, value]) => {
            return `\`${column}\` = ${formatValue(value)}`;
        });

        const tableName = formatTableName(params.table, params.catalog, params.schema);
        let sql = `UPDATE ${tableName} SET ${setClauses.join(", ")}`;

        if (params.where) {
            sql += ` WHERE ${params.where}`;
        }

        const result = await client.executeModification(sql);

        return {
            success: true,
            data: {
                rowsAffected: result.rowsAffected
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed";

        return {
            success: false,
            error: {
                type: message.includes("does not exist") ? "not_found" : "server_error",
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

/**
 * Format a table name with optional catalog and schema
 */
function formatTableName(table: string, catalog?: string, schema?: string): string {
    if (table.includes(".")) {
        return table;
    }

    const parts: string[] = [];
    if (catalog) {
        parts.push(`\`${catalog}\``);
    }
    if (schema) {
        parts.push(`\`${schema}\``);
    }
    parts.push(`\`${table}\``);

    return parts.join(".");
}
