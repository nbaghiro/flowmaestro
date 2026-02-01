import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Contact Parameters
 */
export const deleteContactSchema = z.object({
    contactId: z.string()
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

/**
 * Operation Definition
 */
export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact by ID (archives the contact)",
    category: "crm",
    inputSchema: deleteContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Contact
 */
export async function executeDeleteContact(
    client: HubspotClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/contacts/${params.contactId}`);

        return {
            success: true,
            data: {
                deleted: true,
                contactId: params.contactId
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
