import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const addTagsToContactsSchema = z.object({
    tagIds: z.array(z.string()).min(1).describe("Tag IDs to add"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to tag")
});

export type AddTagsToContactsParams = z.infer<typeof addTagsToContactsSchema>;

export const addTagsToContactsOperation: OperationDefinition = {
    id: "addTagsToContacts",
    name: "Add Tags to Contacts",
    description: "Add one or more tags to contacts in Constant Contact",
    category: "tags",
    inputSchema: addTagsToContactsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddTagsToContacts(
    client: ConstantContactClient,
    params: AddTagsToContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.addTagsToContacts(params.tagIds, params.contactIds);

        return {
            success: true,
            data: {
                added: true,
                tagIds: params.tagIds,
                contactIds: params.contactIds,
                activityId: response.activity_id
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add tags to contacts";
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
