import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Pool, QueryResult } from "pg";

/**
 * Query operation schema
 */
export const querySchema = z.object({
    query: z.string().min(1).describe("SQL query to execute"),
    parameters: z.array(z.any()).optional().describe("Query parameters for parameterized queries"),
    returnFormat: z
        .enum(["array", "single", "count"])
        .optional()
        .default("array")
        .describe("How to format the results"),
    outputVariable: z.string().optional().describe("Variable name to store the result")
});

export type QueryParams = z.infer<typeof querySchema>;

/**
 * Query operation definition
 */
export const queryOperation: OperationDefinition = {
    id: "query",
    name: "Execute Query",
    description: "Execute a SELECT query and return results",
    category: "database",
    inputSchema: querySchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute query operation
 */
export async function executeQuery(pool: Pool, params: QueryParams): Promise<OperationResult> {
    try {
        const result: QueryResult = await pool.query(params.query, params.parameters || []);

        let formattedData: unknown;
        switch (params.returnFormat) {
            case "single":
                formattedData = result.rows[0] || null;
                break;
            case "count":
                formattedData = result.rowCount || 0;
                break;
            case "array":
            default:
                formattedData = result.rows;
                break;
        }

        return {
            success: true,
            data: {
                result: formattedData,
                rowCount: result.rowCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to execute query",
                retryable: false
            }
        };
    }
}
