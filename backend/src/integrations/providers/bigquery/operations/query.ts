import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { BigQueryClient } from "../client/BigQueryClient";

/**
 * Query operation schema
 */
export const querySchema = z.object({
    query: z.string().min(1).describe("SQL query to execute"),
    useLegacySql: z
        .boolean()
        .optional()
        .default(false)
        .describe("Use legacy SQL syntax instead of standard SQL"),
    timeout: z.number().optional().default(300000).describe("Query timeout in milliseconds"),
    returnFormat: z
        .enum(["array", "single", "count"])
        .optional()
        .default("array")
        .describe("How to format results: array (all rows), single (first row), count (row count)")
});

export type QueryParams = z.infer<typeof querySchema>;

/**
 * Query operation definition
 */
export const queryOperation: OperationDefinition = {
    id: "query",
    name: "Execute Query",
    description: "Execute a SQL query against BigQuery and return results",
    category: "database",
    inputSchema: querySchema,
    retryable: true,
    timeout: 300000
};

/**
 * Execute query operation
 */
export async function executeQuery(
    client: BigQueryClient,
    params: QueryParams
): Promise<OperationResult> {
    try {
        const result = await client.executeQuery(params.query, {
            useLegacySql: params.useLegacySql,
            timeout: params.timeout
        });

        let formattedData: unknown;
        let count: number;

        switch (params.returnFormat) {
            case "single":
                formattedData = result.rows[0] || null;
                count = formattedData ? 1 : 0;
                break;
            case "count":
                formattedData = result.rowCount;
                count = result.rowCount;
                break;
            case "array":
            default:
                formattedData = result.rows;
                count = result.rows.length;
                break;
        }

        return {
            success: true,
            data: {
                result: formattedData,
                columns: result.columns,
                count,
                totalBytesProcessed: result.totalBytesProcessed
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Query failed";
        const isRetryable =
            message.includes("timed out") ||
            message.includes("Service Unavailable") ||
            message.includes("rateLimitExceeded");

        return {
            success: false,
            error: {
                type:
                    message.includes("syntax") || message.includes("Syntax")
                        ? "validation"
                        : message.includes("Not found") || message.includes("not found")
                          ? "not_found"
                          : message.includes("permission") || message.includes("Access Denied")
                            ? "permission"
                            : "server_error",
                message,
                retryable: isRetryable
            }
        };
    }
}
