import { toJSONSchema } from "../../../core/schema-utils";
import { getContactInputSchema, type GetContactInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Retrieve a contact by ID from Apollo",
    category: "contacts",
    inputSchema: getContactInputSchema,
    inputSchemaJSON: toJSONSchema(getContactInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetContact(
    client: ApolloClient,
    params: GetContactInput
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            contact: unknown;
        }>(`/api/v1/contacts/${params.contact_id}`);

        return {
            success: true,
            data: response.contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}
