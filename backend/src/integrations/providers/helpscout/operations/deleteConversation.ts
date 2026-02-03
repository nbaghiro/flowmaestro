import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deleteConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID to delete")
});

export type DeleteConversationParams = z.infer<typeof deleteConversationSchema>;

export const deleteConversationOperation: OperationDefinition = {
    id: "deleteConversation",
    name: "Delete Conversation",
    description: "Delete a conversation (moves to trash)",
    category: "conversations",
    actionType: "write",
    inputSchema: deleteConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteConversation(
    client: HelpScoutClient,
    params: DeleteConversationParams
): Promise<OperationResult> {
    try {
        await client.delete<null>(`/conversations/${params.conversation_id}`);

        return {
            success: true,
            data: {
                conversationId: params.conversation_id,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete conversation",
                retryable: false
            }
        };
    }
}
