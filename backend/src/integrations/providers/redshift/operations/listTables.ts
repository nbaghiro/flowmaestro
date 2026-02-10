import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RedshiftClient } from "../client/RedshiftClient";

/**
 * List tables operation schema
 */
export const listTablesSchema = z.object({
    database: z
        .string()
        .optional()
        .describe("Database name (uses connection default if not specified)"),
    schema: z.string().optional().default("public").describe("Schema name to list tables from")
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

/**
 * List tables operation definition
 */
export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables in a Redshift schema",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    client: RedshiftClient,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const tables = await client.listTables(params.database, params.schema);

        return {
            success: true,
            data: {
                tables,
                count: tables.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list tables";

        return {
            success: false,
            error: {
                type:
                    message.includes("does not exist") || message.includes("not found")
                        ? "not_found"
                        : message.includes("permission")
                          ? "permission"
                          : "server_error",
                message,
                retryable: !message.includes("does not exist")
            }
        };
    }
}
