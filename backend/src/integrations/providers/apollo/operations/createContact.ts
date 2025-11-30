import { toJSONSchema } from "../../../core/schema-utils";
import { createContactInputSchema, type CreateContactInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Apollo",
    category: "contacts",
    inputSchema: createContactInputSchema,
    inputSchemaJSON: toJSONSchema(createContactInputSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateContact(
    client: ApolloClient,
    params: CreateContactInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            contact: unknown;
        }>("/api/v1/contacts", params);

        return {
            success: true,
            data: response.contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
