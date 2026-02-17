import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const addToListSchema = z.object({
    contactId: z.string().describe("The ID of the contact to add"),
    listId: z.string().describe("The ID of the list to add the contact to")
});

export type AddToListParams = z.infer<typeof addToListSchema>;

export const addToListOperation: OperationDefinition = {
    id: "addToList",
    name: "Add to List",
    description: "Add a contact to a list in ActiveCampaign",
    category: "lists",
    inputSchema: addToListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddToList(
    client: ActiveCampaignClient,
    params: AddToListParams
): Promise<OperationResult> {
    try {
        const response = await client.addContactToList(params.contactId, params.listId);

        return {
            success: true,
            data: {
                added: true,
                contactId: response.contactList.contact,
                listId: response.contactList.list,
                status: response.contactList.status
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add contact to list";
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
