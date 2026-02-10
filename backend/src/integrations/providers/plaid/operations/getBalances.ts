import { z } from "zod";
import type { PlaidBalanceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const getBalancesSchema = z.object({
    accessToken: z.string().min(1).describe("The Plaid access token for the linked account")
});

export type GetBalancesParams = z.infer<typeof getBalancesSchema>;

export const getBalancesOperation: OperationDefinition = {
    id: "getBalances",
    name: "Get Balances",
    description: "Get real-time balance information for accounts",
    category: "accounts",
    inputSchema: getBalancesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetBalances(
    client: PlaidClient,
    params: GetBalancesParams
): Promise<OperationResult> {
    try {
        const response = await client.getBalances(params.accessToken);

        const formattedBalances: PlaidBalanceOutput[] = response.accounts.map((account) => ({
            accountId: account.account_id,
            name: account.name,
            balances: {
                available: account.balances.available,
                current: account.balances.current,
                limit: account.balances.limit,
                isoCurrencyCode: account.balances.iso_currency_code,
                lastUpdatedDatetime: account.balances.last_updated_datetime
            }
        }));

        return {
            success: true,
            data: {
                balances: formattedBalances,
                count: formattedBalances.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get balances",
                retryable: true
            }
        };
    }
}
