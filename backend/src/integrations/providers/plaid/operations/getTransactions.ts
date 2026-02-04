import { z } from "zod";
import type { PlaidTransactionOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const getTransactionsSchema = z.object({
    accessToken: z.string().min(1).describe("The Plaid access token for the linked account"),
    startDate: z.string().min(1).describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().min(1).describe("End date in YYYY-MM-DD format"),
    count: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .default(100)
        .describe("Number of transactions to return (1-500)"),
    offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe("Number of transactions to skip for pagination")
});

export type GetTransactionsParams = z.infer<typeof getTransactionsSchema>;

export const getTransactionsOperation: OperationDefinition = {
    id: "getTransactions",
    name: "Get Transactions",
    description: "Get transactions for an account within a date range",
    category: "transactions",
    inputSchema: getTransactionsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetTransactions(
    client: PlaidClient,
    params: GetTransactionsParams
): Promise<OperationResult> {
    try {
        const response = await client.getTransactions(
            params.accessToken,
            params.startDate,
            params.endDate,
            params.count,
            params.offset
        );

        const formattedTransactions: PlaidTransactionOutput[] = response.transactions.map(
            (txn) => ({
                transactionId: txn.transaction_id,
                accountId: txn.account_id,
                amount: txn.amount,
                isoCurrencyCode: txn.iso_currency_code,
                date: txn.date,
                name: txn.name,
                merchantName: txn.merchant_name,
                category: txn.category,
                pending: txn.pending,
                paymentChannel: txn.payment_channel,
                location: txn.location
                    ? {
                          address: txn.location.address,
                          city: txn.location.city,
                          region: txn.location.region,
                          postalCode: txn.location.postal_code,
                          country: txn.location.country
                      }
                    : undefined
            })
        );

        return {
            success: true,
            data: {
                transactions: formattedTransactions,
                count: formattedTransactions.length,
                totalTransactions: response.total_transactions
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get transactions",
                retryable: true
            }
        };
    }
}
