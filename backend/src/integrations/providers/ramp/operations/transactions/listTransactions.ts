import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampTransaction, RampListResponse } from "../types";

/**
 * List Transactions operation schema
 */
export const listTransactionsSchema = z.object({
    start: z.string().optional().describe("Start cursor for pagination"),
    page_size: z.number().min(1).max(100).optional().default(25),
    from_date: z.string().optional().describe("Filter from date (ISO 8601)"),
    to_date: z.string().optional().describe("Filter to date (ISO 8601)"),
    state: z.enum(["PENDING", "CLEARED", "DECLINED"]).optional()
});

export type ListTransactionsParams = z.infer<typeof listTransactionsSchema>;

/**
 * List Transactions operation definition
 */
export const listTransactionsOperation: OperationDefinition = {
    id: "listTransactions",
    name: "List Transactions",
    description: "List all card transactions with pagination and filters",
    category: "transactions",
    inputSchema: listTransactionsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list transactions operation
 */
export async function executeListTransactions(
    client: RampClient,
    params: ListTransactionsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            page_size: String(params.page_size)
        };

        if (params.start) queryParams.start = params.start;
        if (params.from_date) queryParams.from_date = params.from_date;
        if (params.to_date) queryParams.to_date = params.to_date;
        if (params.state) queryParams.state = params.state;

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<RampListResponse<RampTransaction>>(
            `/transactions?${queryString}`
        );

        return {
            success: true,
            data: {
                transactions: response.data,
                count: response.data.length,
                next_cursor: response.page?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list transactions",
                retryable: true
            }
        };
    }
}
