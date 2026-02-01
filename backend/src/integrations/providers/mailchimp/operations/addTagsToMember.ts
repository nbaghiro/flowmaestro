import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const addTagsToMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the member"),
    tags: z.array(z.string().min(1)).min(1).describe("Tag names to add to the member")
});

export type AddTagsToMemberParams = z.infer<typeof addTagsToMemberSchema>;

export const addTagsToMemberOperation: OperationDefinition = {
    id: "addTagsToMember",
    name: "Add Tags to Member",
    description: "Add tags to a member in a Mailchimp audience",
    category: "tags",
    inputSchema: addTagsToMemberSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddTagsToMember(
    client: MailchimpClient,
    params: AddTagsToMemberParams
): Promise<OperationResult> {
    try {
        await client.addTagsToMember(params.listId, params.email, params.tags);

        return {
            success: true,
            data: {
                added: true,
                email: params.email,
                tags: params.tags
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add tags to member",
                retryable: false
            }
        };
    }
}
