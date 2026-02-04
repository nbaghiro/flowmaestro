import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { Connection, Binds } from "snowflake-sdk";

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
    timeout: 60000
};

/**
 * Execute a SQL statement and return rows as a Promise
 */
function executeAsync(
    conn: Connection,
    sqlText: string,
    binds?: Binds
): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
        conn.execute({
            sqlText,
            binds,
            complete: (err, _stmt, rows) => {
                if (err) reject(err);
                else resolve((rows as Record<string, unknown>[]) || []);
            }
        });
    });
}

/**
 * Execute query operation
 */
export async function executeQuery(
    conn: Connection,
    params: QueryParams
): Promise<OperationResult> {
    try {
        const rows = await executeAsync(conn, params.query, (params.parameters || []) as Binds);

        let formattedData: unknown;
        switch (params.returnFormat) {
            case "single":
                formattedData = rows[0] || null;
                break;
            case "count":
                formattedData = rows.length;
                break;
            case "array":
            default:
                formattedData = rows;
                break;
        }

        return {
            success: true,
            data: {
                result: formattedData,
                rowCount: rows.length
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
