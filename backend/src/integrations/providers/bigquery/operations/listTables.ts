import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { BigQueryClient } from "../client/BigQueryClient";

/**
 * List tables operation schema
 */
export const listTablesSchema = z.object({
    datasetId: z.string().min(1).describe("Dataset ID to list tables from"),
    maxResults: z.number().optional().describe("Maximum number of tables to return")
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

/**
 * List tables operation definition
 */
export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables in a BigQuery dataset",
    category: "database",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list tables operation
 */
export async function executeListTables(
    client: BigQueryClient,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const tables = await client.listTables(params.datasetId, {
            maxResults: params.maxResults
        });

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
                    message.includes("Not found") || message.includes("not found")
                        ? "not_found"
                        : message.includes("permission")
                          ? "permission"
                          : "server_error",
                message,
                retryable: !message.includes("Not found")
            }
        };
    }
}
