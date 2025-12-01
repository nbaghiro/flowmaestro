import { toJSONSchema } from "../../../core/schema-utils";
import { createAccountInputSchema, type CreateAccountInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const createAccountOperation: OperationDefinition = {
    id: "createAccount",
    name: "Create Account",
    description: "Create a new account (organization) in Apollo",
    category: "accounts",
    inputSchema: createAccountInputSchema,
    inputSchemaJSON: toJSONSchema(createAccountInputSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateAccount(
    client: ApolloClient,
    params: CreateAccountInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            account: unknown;
        }>("/api/v1/accounts", params);

        return {
            success: true,
            data: response.account
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create account",
                retryable: false
            }
        };
    }
}
