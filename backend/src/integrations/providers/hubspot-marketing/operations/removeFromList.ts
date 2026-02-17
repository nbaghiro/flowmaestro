import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const removeFromListSchema = z.object({
    listId: z.number().describe("The ID of the list to remove contacts from"),
    contactIds: z
        .array(z.string())
        .min(1)
        .max(500)
        .describe("Array of contact IDs to remove from the list")
});

export type RemoveFromListParams = z.infer<typeof removeFromListSchema>;

export const removeFromListOperation: OperationDefinition = {
    id: "removeFromList",
    name: "Remove from List",
    description: "Remove contacts from a HubSpot Marketing list",
    category: "lists",
    inputSchema: removeFromListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeRemoveFromList(
    client: HubspotMarketingClient,
    params: RemoveFromListParams
): Promise<OperationResult> {
    try {
        const result = await client.removeContactsFromList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                removed: true,
                listId: params.listId,
                updatedContacts: result.updated,
                discardedContacts: result.discarded
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove contacts from list";
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
