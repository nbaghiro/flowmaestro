import { toJSONSchema } from "../../../core/schema-utils";
import { updateContactInputSchema, type UpdateContactInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact in Apollo",
    category: "contacts",
    inputSchema: updateContactInputSchema,
    inputSchemaJSON: toJSONSchema(updateContactInputSchema),
    retryable: false,
    timeout: 30000
};

export async function executeUpdateContact(
    client: ApolloClient,
    params: UpdateContactInput
): Promise<OperationResult> {
    try {
        const { contact_id, ...updateData } = params;
        const response = await client.patch<{
            contact: unknown;
        }>(`/api/v1/contacts/${contact_id}`, updateData);

        return {
            success: true,
            data: response.contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}
