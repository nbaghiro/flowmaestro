import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const deleteContactSchema = z.object({
    contactId: z.string().describe("The contact ID to delete")
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact from Constant Contact",
    category: "contacts",
    inputSchema: deleteContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeDeleteContact(
    client: ConstantContactClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        await client.deleteContact(params.contactId);

        return {
            success: true,
            data: {
                deleted: true,
                contactId: params.contactId
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete contact";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
