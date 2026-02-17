import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const removeTagsFromContactsSchema = z.object({
    tagIds: z.array(z.string()).min(1).describe("Tag IDs to remove"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to untag")
});

export type RemoveTagsFromContactsParams = z.infer<typeof removeTagsFromContactsSchema>;

export const removeTagsFromContactsOperation: OperationDefinition = {
    id: "removeTagsFromContacts",
    name: "Remove Tags from Contacts",
    description: "Remove one or more tags from contacts in Constant Contact",
    category: "tags",
    inputSchema: removeTagsFromContactsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeRemoveTagsFromContacts(
    client: ConstantContactClient,
    params: RemoveTagsFromContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.removeTagsFromContacts(params.tagIds, params.contactIds);

        return {
            success: true,
            data: {
                removed: true,
                tagIds: params.tagIds,
                contactIds: params.contactIds,
                activityId: response.activity_id
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove tags from contacts";
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
