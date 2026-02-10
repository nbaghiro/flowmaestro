import { z } from "zod";
import type { PlaidAccountOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const getAccountsSchema = z.object({
    accessToken: z.string().min(1).describe("The Plaid access token for the linked account")
});

export type GetAccountsParams = z.infer<typeof getAccountsSchema>;

export const getAccountsOperation: OperationDefinition = {
    id: "getAccounts",
    name: "Get Accounts",
    description: "Get a list of accounts associated with a Plaid access token",
    category: "accounts",
    inputSchema: getAccountsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetAccounts(
    client: PlaidClient,
    params: GetAccountsParams
): Promise<OperationResult> {
    try {
        const response = await client.getAccounts(params.accessToken);

        const formattedAccounts: PlaidAccountOutput[] = response.accounts.map((account) => ({
            accountId: account.account_id,
            name: account.name,
            officialName: account.official_name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            balances: {
                available: account.balances.available,
                current: account.balances.current,
                limit: account.balances.limit,
                isoCurrencyCode: account.balances.iso_currency_code
            }
        }));

        return {
            success: true,
            data: {
                accounts: formattedAccounts,
                count: formattedAccounts.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get accounts",
                retryable: true
            }
        };
    }
}
