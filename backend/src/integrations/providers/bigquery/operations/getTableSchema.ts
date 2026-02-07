import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { BigQueryClient } from "../client/BigQueryClient";

/**
 * Get table schema operation schema
 */
export const getTableSchemaSchema = z.object({
    datasetId: z.string().min(1).describe("Dataset ID containing the table"),
    tableId: z.string().min(1).describe("Table ID to get schema for")
});

export type GetTableSchemaParams = z.infer<typeof getTableSchemaSchema>;

/**
 * Get table schema operation definition
 */
export const getTableSchemaOperation: OperationDefinition = {
    id: "getTableSchema",
    name: "Get Table Schema",
    description: "Get the schema and metadata for a BigQuery table",
    category: "database",
    inputSchema: getTableSchemaSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get table schema operation
 */
export async function executeGetTableSchema(
    client: BigQueryClient,
    params: GetTableSchemaParams
): Promise<OperationResult> {
    try {
        const schema = await client.getTableSchema(params.datasetId, params.tableId);

        return {
            success: true,
            data: {
                schema: schema.fields,
                tableId: schema.tableId,
                datasetId: schema.datasetId,
                numRows: schema.numRows,
                numBytes: schema.numBytes
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get table schema";

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
                retryable: false
            }
        };
    }
}
