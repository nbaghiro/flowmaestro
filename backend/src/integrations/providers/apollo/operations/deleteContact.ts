import { deleteContactInputSchema, type DeleteContactInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact from Apollo",
    category: "contacts",
    inputSchema: deleteContactInputSchema,
    retryable: false,
    timeout: 30000
};

export async function executeDeleteContact(
    client: ApolloClient,
    params: DeleteContactInput
): Promise<OperationResult> {
    try {
        await client.delete(`/api/v1/contacts/${params.contact_id}`);

        return {
            success: true,
            data: {
                message: "Contact deleted successfully",
                contact_id: params.contact_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete contact",
                retryable: false
            }
        };
    }
}
