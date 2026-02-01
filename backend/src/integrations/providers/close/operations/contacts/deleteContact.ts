import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";

/**
 * Delete Contact Parameters
 */
export const deleteContactSchema = z.object({
    id: z.string().describe("The contact ID to delete (starts with 'cont_')")
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

/**
 * Operation Definition
 */
export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact",
    category: "contacts",
    inputSchema: deleteContactSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Contact
 */
export async function executeDeleteContact(
    client: CloseClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        await client.delete(`/contact/${params.id}/`);

        return {
            success: true,
            data: { deleted: true, id: params.id }
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
