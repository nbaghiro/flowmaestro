import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const removeTagSchema = z.object({
    contactTagId: z.string().describe("The ID of the contact-tag association to remove")
});

export type RemoveTagParams = z.infer<typeof removeTagSchema>;

export const removeTagOperation: OperationDefinition = {
    id: "removeTag",
    name: "Remove Tag",
    description: "Remove a tag from a contact in ActiveCampaign",
    category: "tags",
    inputSchema: removeTagSchema,
    retryable: false,
    timeout: 15000
};

export async function executeRemoveTag(
    client: ActiveCampaignClient,
    params: RemoveTagParams
): Promise<OperationResult> {
    try {
        await client.removeTagFromContact(params.contactTagId);

        return {
            success: true,
            data: {
                removed: true,
                contactTagId: params.contactTagId
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove tag from contact";
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
