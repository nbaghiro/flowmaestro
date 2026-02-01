import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const addContactsToListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to add to the list")
});

export type AddContactsToListParams = z.infer<typeof addContactsToListSchema>;

export const addContactsToListOperation: OperationDefinition = {
    id: "addContactsToList",
    name: "Add Contacts to List",
    description: "Add existing contacts to a list in SendGrid (async operation)",
    category: "lists",
    inputSchema: addContactsToListSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddContactsToList(
    client: SendGridClient,
    params: AddContactsToListParams
): Promise<OperationResult> {
    try {
        const result = await client.addContactsToList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                jobId: result.job_id,
                listId: params.listId,
                contactCount: params.contactIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add contacts to list",
                retryable: false
            }
        };
    }
}
