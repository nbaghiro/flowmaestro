import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { BigQueryClient } from "../client/BigQueryClient";

/**
 * Insert operation schema
 */
export const insertSchema = z.object({
    datasetId: z.string().min(1).describe("Dataset ID containing the table"),
    tableId: z.string().min(1).describe("Table ID to insert rows into"),
    rows: z
        .array(z.record(z.unknown()))
        .min(1)
        .describe("Array of row objects to insert (streaming insert)")
});

export type InsertParams = z.infer<typeof insertSchema>;

/**
 * Insert operation definition
 */
export const insertOperation: OperationDefinition = {
    id: "insert",
    name: "Insert Rows",
    description: "Insert rows into a BigQuery table using streaming insert",
    category: "database",
    inputSchema: insertSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute insert operation
 */
export async function executeInsert(
    client: BigQueryClient,
    params: InsertParams
): Promise<OperationResult> {
    try {
        const result = await client.insertRows(params.datasetId, params.tableId, params.rows);

        return {
            success: true,
            data: {
                insertedCount: result.insertedCount,
                errors: result.errors
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Insert failed";

        return {
            success: false,
            error: {
                type:
                    message.includes("Not found") || message.includes("not found")
                        ? "not_found"
                        : message.includes("permission")
                          ? "permission"
                          : message.includes("invalid") || message.includes("Invalid")
                            ? "validation"
                            : "server_error",
                message,
                retryable: false
            }
        };
    }
}
