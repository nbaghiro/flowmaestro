import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateConversationTagsSchema = z.object({
    conversation_id: z.number().describe("Conversation ID"),
    tags: z.array(z.string()).describe("List of tag names to set on the conversation")
});

export type UpdateConversationTagsParams = z.infer<typeof updateConversationTagsSchema>;

export const updateConversationTagsOperation: OperationDefinition = {
    id: "updateConversationTags",
    name: "Update Conversation Tags",
    description: "Replace all tags on a conversation",
    category: "conversations",
    actionType: "write",
    inputSchema: updateConversationTagsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateConversationTags(
    client: HelpScoutClient,
    params: UpdateConversationTagsParams
): Promise<OperationResult> {
    try {
        await client.put<null>(`/conversations/${params.conversation_id}/tags`, {
            tags: params.tags
        });

        return {
            success: true,
            data: {
                conversationId: params.conversation_id,
                tags: params.tags,
                updated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to update conversation tags",
                retryable: true
            }
        };
    }
}
