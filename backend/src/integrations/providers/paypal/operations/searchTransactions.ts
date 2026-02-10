import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalTransactionsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Search Transactions operation schema
 */
export const searchTransactionsSchema = z.object({
    start_date: z.string().describe("Start date in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')"),
    end_date: z.string().describe("End date in ISO 8601 format (e.g., '2024-01-31T23:59:59Z')"),
    transaction_id: z.string().optional().describe("Filter by specific transaction ID"),
    transaction_status: z
        .enum(["D", "P", "S", "V"])
        .optional()
        .describe("Status: D=Denied, P=Pending, S=Successful, V=Reversed"),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(100)
        .describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type SearchTransactionsParams = z.infer<typeof searchTransactionsSchema>;

/**
 * Search Transactions operation definition
 */
export const searchTransactionsOperation: OperationDefinition = {
    id: "searchTransactions",
    name: "Search Transactions",
    description: "Search PayPal transaction history with date range and filters",
    category: "reporting",
    actionType: "read",
    inputSchema: searchTransactionsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute search transactions operation
 */
export async function executeSearchTransactions(
    client: PaypalClient,
    params: SearchTransactionsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start_date: params.start_date,
            end_date: params.end_date,
            page_size: params.page_size,
            page: params.page,
            fields: "all"
        };

        if (params.transaction_id) {
            queryParams.transaction_id = params.transaction_id;
        }
        if (params.transaction_status) {
            queryParams.transaction_status = params.transaction_status;
        }

        const response = await client.get<PaypalTransactionsResponse>(
            "/v1/reporting/transactions",
            queryParams
        );

        const transactions = (response.transaction_details || []).map((detail) => ({
            transactionId: detail.transaction_info.transaction_id,
            eventCode: detail.transaction_info.transaction_event_code,
            initiationDate: detail.transaction_info.transaction_initiation_date,
            updatedDate: detail.transaction_info.transaction_updated_date,
            amount: detail.transaction_info.transaction_amount,
            fee: detail.transaction_info.fee_amount,
            status: detail.transaction_info.transaction_status,
            subject: detail.transaction_info.transaction_subject,
            note: detail.transaction_info.transaction_note,
            payerEmail: detail.payer_info?.email_address,
            payerName: detail.payer_info?.payer_name
        }));

        return {
            success: true,
            data: {
                transactions,
                totalItems: response.total_items,
                totalPages: response.total_pages,
                page: response.page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search transactions",
                retryable: true
            }
        };
    }
}
