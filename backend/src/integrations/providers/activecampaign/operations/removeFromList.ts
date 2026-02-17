import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const removeFromListSchema = z.object({
    contactId: z.string().describe("The ID of the contact to remove"),
    listId: z.string().describe("The ID of the list to remove the contact from")
});

export type RemoveFromListParams = z.infer<typeof removeFromListSchema>;

export const removeFromListOperation: OperationDefinition = {
    id: "removeFromList",
    name: "Remove from List",
    description: "Remove a contact from a list in ActiveCampaign",
    category: "lists",
    inputSchema: removeFromListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeRemoveFromList(
    client: ActiveCampaignClient,
    params: RemoveFromListParams
): Promise<OperationResult> {
    try {
        await client.removeContactFromList(params.contactId, params.listId);

        return {
            success: true,
            data: {
                removed: true,
                contactId: params.contactId,
                listId: params.listId
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove contact from list";
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
