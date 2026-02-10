import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Contact operation schema
 */
export const deleteContactSchema = z.object({
    contact_id: z.number().describe("The ID of the contact to delete")
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

/**
 * Delete Contact operation definition
 */
export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact from Insightly CRM",
    category: "contacts",
    inputSchema: deleteContactSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete contact operation
 */
export async function executeDeleteContact(
    client: InsightlyClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        await client.delete(`/Contacts/${params.contact_id}`);

        return {
            success: true,
            data: {
                deleted: true,
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
