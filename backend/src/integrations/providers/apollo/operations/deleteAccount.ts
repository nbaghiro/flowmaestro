import { toJSONSchema } from "../../../core/schema-utils";
import { deleteAccountInputSchema, type DeleteAccountInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const deleteAccountOperation: OperationDefinition = {
    id: "deleteAccount",
    name: "Delete Account",
    description: "Delete an account (organization) from Apollo",
    category: "accounts",
    inputSchema: deleteAccountInputSchema,
    inputSchemaJSON: toJSONSchema(deleteAccountInputSchema),
    retryable: false,
    timeout: 30000
};

export async function executeDeleteAccount(
    client: ApolloClient,
    params: DeleteAccountInput
): Promise<OperationResult> {
    try {
        await client.delete(`/api/v1/accounts/${params.account_id}`);

        return {
            success: true,
            data: {
                message: "Account deleted successfully",
                account_id: params.account_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete account",
                retryable: false
            }
        };
    }
}
