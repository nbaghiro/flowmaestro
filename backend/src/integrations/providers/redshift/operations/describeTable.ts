import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RedshiftClient } from "../client/RedshiftClient";

/**
 * Describe table operation schema
 */
export const describeTableSchema = z.object({
    table: z.string().min(1).describe("Table name to describe"),
    database: z
        .string()
        .optional()
        .describe("Database name (uses connection default if not specified)"),
    schema: z.string().optional().default("public").describe("Schema name containing the table")
});

export type DescribeTableParams = z.infer<typeof describeTableSchema>;

/**
 * Describe table operation definition
 */
export const describeTableOperation: OperationDefinition = {
    id: "describeTable",
    name: "Describe Table",
    description: "Get column information for a Redshift table",
    category: "database",
    inputSchema: describeTableSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute describe table operation
 */
export async function executeDescribeTable(
    client: RedshiftClient,
    params: DescribeTableParams
): Promise<OperationResult> {
    try {
        const columns = await client.describeTable(params.table, params.database, params.schema);

        return {
            success: true,
            data: {
                columns,
                table: params.table,
                schema: params.schema,
                count: columns.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to describe table";

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
                retryable: false
            }
        };
    }
}
