import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const removeTagsFromMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the member"),
    tags: z.array(z.string().min(1)).min(1).describe("Tag names to remove from the member")
});

export type RemoveTagsFromMemberParams = z.infer<typeof removeTagsFromMemberSchema>;

export const removeTagsFromMemberOperation: OperationDefinition = {
    id: "removeTagsFromMember",
    name: "Remove Tags from Member",
    description: "Remove tags from a member in a Mailchimp audience",
    category: "tags",
    inputSchema: removeTagsFromMemberSchema,
    inputSchemaJSON: toJSONSchema(removeTagsFromMemberSchema),
    retryable: false,
    timeout: 10000
};

export async function executeRemoveTagsFromMember(
    client: MailchimpClient,
    params: RemoveTagsFromMemberParams
): Promise<OperationResult> {
    try {
        await client.removeTagsFromMember(params.listId, params.email, params.tags);

        return {
            success: true,
            data: {
                removed: true,
                email: params.email,
                tags: params.tags
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove tags from member",
                retryable: false
            }
        };
    }
}
