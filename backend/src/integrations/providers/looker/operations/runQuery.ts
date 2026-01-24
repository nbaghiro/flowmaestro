import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LookerClient } from "../client/LookerClient";
import { LookerQueryIdSchema, LookerFormatSchema, LookerLimitSchema } from "./schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Run Query operation schema
 */
export const runQuerySchema = z.object({
    query_id: LookerQueryIdSchema,
    result_format: LookerFormatSchema,
    limit: LookerLimitSchema
});

export type RunQueryParams = z.infer<typeof runQuerySchema>;

/**
 * Run Query operation definition
 */
export const runQueryOperation: OperationDefinition = {
    id: "runQuery",
    name: "Run Query",
    description: "Run a saved query by ID and return results",
    category: "queries",
    inputSchema: runQuerySchema,
    inputSchemaJSON: toJSONSchema(runQuerySchema),
    retryable: true,
    timeout: 120000
};

/**
 * Execute run query operation
 */
export async function executeRunQuery(
    client: LookerClient,
    params: RunQueryParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            limit: params.limit.toString()
        };

        const result = await client.get<unknown>(
            `/queries/${params.query_id}/run/${params.result_format}`,
            queryParams
        );

        return {
            success: true,
            data: {
                format: params.result_format,
                result
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to run query",
                retryable: true
            }
        };
    }
}
