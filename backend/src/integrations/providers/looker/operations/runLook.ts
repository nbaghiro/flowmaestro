import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import { LookerLookIdSchema, LookerFormatSchema, LookerLimitSchema } from "./schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Run Look operation schema
 */
export const runLookSchema = z.object({
    look_id: LookerLookIdSchema,
    result_format: LookerFormatSchema,
    limit: LookerLimitSchema
});

export type RunLookParams = z.infer<typeof runLookSchema>;

/**
 * Run Look operation definition
 */
export const runLookOperation: OperationDefinition = {
    id: "runLook",
    name: "Run Look",
    description: "Execute a Look and return the query results",
    category: "looks",
    inputSchema: runLookSchema,
    retryable: true,
    timeout: 120000 // Queries can take a while
};

/**
 * Execute run look operation
 */
export async function executeRunLook(
    client: LookerClient,
    params: RunLookParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            limit: params.limit.toString()
        };

        const result = await client.get<unknown>(
            `/looks/${params.look_id}/run/${params.result_format}`,
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
                message: error instanceof Error ? error.message : "Failed to run look",
                retryable: true
            }
        };
    }
}
