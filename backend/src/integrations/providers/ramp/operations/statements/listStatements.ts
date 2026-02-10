import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampStatement, RampListResponse } from "../types";

/**
 * List Statements operation schema
 */
export const listStatementsSchema = z.object({
    start: z.string().optional().describe("Start cursor for pagination"),
    page_size: z.number().min(1).max(100).optional().default(25)
});

export type ListStatementsParams = z.infer<typeof listStatementsSchema>;

/**
 * List Statements operation definition
 */
export const listStatementsOperation: OperationDefinition = {
    id: "listStatements",
    name: "List Statements",
    description: "List all billing statements with pagination",
    category: "statements",
    inputSchema: listStatementsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list statements operation
 */
export async function executeListStatements(
    client: RampClient,
    params: ListStatementsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            page_size: String(params.page_size)
        };

        if (params.start) queryParams.start = params.start;

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<RampListResponse<RampStatement>>(
            `/statements?${queryString}`
        );

        return {
            success: true,
            data: {
                statements: response.data,
                count: response.data.length,
                next_cursor: response.page?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list statements",
                retryable: true
            }
        };
    }
}
