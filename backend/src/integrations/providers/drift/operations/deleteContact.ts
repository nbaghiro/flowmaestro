import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deleteContactSchema = z.object({
    contact_id: z.number().describe("Contact ID to delete")
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact from Drift",
    category: "contacts",
    actionType: "write",
    inputSchema: deleteContactSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteContact(
    client: DriftClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        await client.delete<null>(`/contacts/${params.contact_id}`);

        return {
            success: true,
            data: {
                contactId: params.contact_id,
                deleted: true
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
