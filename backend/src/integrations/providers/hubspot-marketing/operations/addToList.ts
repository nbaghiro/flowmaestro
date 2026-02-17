import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const addToListSchema = z.object({
    listId: z.number().describe("The ID of the list to add contacts to"),
    contactIds: z
        .array(z.string())
        .min(1)
        .max(500)
        .describe("Array of contact IDs to add to the list")
});

export type AddToListParams = z.infer<typeof addToListSchema>;

export const addToListOperation: OperationDefinition = {
    id: "addToList",
    name: "Add to List",
    description: "Add contacts to a HubSpot Marketing list",
    category: "lists",
    inputSchema: addToListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddToList(
    client: HubspotMarketingClient,
    params: AddToListParams
): Promise<OperationResult> {
    try {
        const result = await client.addContactsToList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                added: true,
                listId: params.listId,
                updatedContacts: result.updated,
                discardedContacts: result.discarded
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add contacts to list";
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
