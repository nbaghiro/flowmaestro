import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatabricksClient } from "../client/DatabricksClient";

/**
 * Delete operation schema
 */
export const deleteSchema = z.object({
    table: z.string().min(1).describe("Full table name (catalog.schema.table or just table name)"),
    where: z
        .string()
        .min(1)
        .describe("WHERE clause condition (without WHERE keyword) - required for safety"),
    catalog: z.string().optional().describe("Catalog name (overrides connection default)"),
    schema: z.string().optional().describe("Schema name (overrides connection default)")
});

export type DeleteParams = z.infer<typeof deleteSchema>;

/**
 * Delete operation definition
 */
export const deleteOperation: OperationDefinition = {
    id: "delete",
    name: "Delete Data",
    description: "Delete rows from a table matching a condition",
    category: "database",
    inputSchema: deleteSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute delete operation
 */
export async function executeDelete(
    client: DatabricksClient,
    params: DeleteParams
): Promise<OperationResult> {
    try {
        const tableName = formatTableName(params.table, params.catalog, params.schema);
        const sql = `DELETE FROM ${tableName} WHERE ${params.where}`;

        const result = await client.executeModification(sql);

        return {
            success: true,
            data: {
                rowsAffected: result.rowsAffected
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Delete failed";

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
