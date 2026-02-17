import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const addTagSchema = z.object({
    contactId: z.string().describe("The ID of the contact to add the tag to"),
    tagId: z.string().describe("The ID of the tag to add")
});

export type AddTagParams = z.infer<typeof addTagSchema>;

export const addTagOperation: OperationDefinition = {
    id: "addTag",
    name: "Add Tag",
    description: "Add a tag to a contact in ActiveCampaign",
    category: "tags",
    inputSchema: addTagSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddTag(
    client: ActiveCampaignClient,
    params: AddTagParams
): Promise<OperationResult> {
    try {
        const response = await client.addTagToContact(params.contactId, params.tagId);

        return {
            success: true,
            data: {
                added: true,
                contactId: response.contactTag.contact,
                tagId: response.contactTag.tag,
                contactTagId: response.contactTag.id,
                createdAt: response.contactTag.cdate
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add tag to contact";
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
