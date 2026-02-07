import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatabricksClient } from "../client/DatabricksClient";

/**
 * List tables operation schema
 */
export const listTablesSchema = z.object({
    catalog: z.string().optional().describe("Catalog name (defaults to connection catalog)"),
    schema: z.string().optional().describe("Schema name (defaults to connection schema)")
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

/**
 * List tables operation definition
 */
export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables in a schema",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    client: DatabricksClient,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const tables = await client.listTables(params.catalog, params.schema);

        return {
            success: true,
            data: {
                tables,
                count: tables.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list tables";
        const isNotFound = message.includes("does not exist") || message.includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
