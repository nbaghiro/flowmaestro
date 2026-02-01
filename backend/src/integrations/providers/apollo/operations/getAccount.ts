import { getAccountInputSchema, type GetAccountInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const getAccountOperation: OperationDefinition = {
    id: "getAccount",
    name: "Get Account",
    description: "Retrieve an account (organization) by ID from Apollo",
    category: "accounts",
    inputSchema: getAccountInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetAccount(
    client: ApolloClient,
    params: GetAccountInput
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            account: unknown;
        }>(`/api/v1/accounts/${params.account_id}`);

        return {
            success: true,
            data: response.account
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get account",
                retryable: true
            }
        };
    }
}
