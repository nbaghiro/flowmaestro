import { updateAccountInputSchema, type UpdateAccountInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const updateAccountOperation: OperationDefinition = {
    id: "updateAccount",
    name: "Update Account",
    description: "Update an existing account (organization) in Apollo",
    category: "accounts",
    inputSchema: updateAccountInputSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateAccount(
    client: ApolloClient,
    params: UpdateAccountInput
): Promise<OperationResult> {
    try {
        const { account_id, ...updateData } = params;
        const response = await client.patch<{
            account: unknown;
        }>(`/api/v1/accounts/${account_id}`, updateData);

        return {
            success: true,
            data: response.account
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update account",
                retryable: false
            }
        };
    }
}
