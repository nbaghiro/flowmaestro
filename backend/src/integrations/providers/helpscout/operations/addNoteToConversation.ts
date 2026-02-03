import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const addNoteToConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID to add note to"),
    text: z.string().describe("Note body text (HTML supported)")
});

export type AddNoteToConversationParams = z.infer<typeof addNoteToConversationSchema>;

export const addNoteToConversationOperation: OperationDefinition = {
    id: "addNoteToConversation",
    name: "Add Note to Conversation",
    description: "Add an internal note to a conversation (not visible to customer)",
    category: "conversations",
    actionType: "write",
    inputSchema: addNoteToConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddNoteToConversation(
    client: HelpScoutClient,
    params: AddNoteToConversationParams
): Promise<OperationResult> {
    try {
        await client.post<null>(`/conversations/${params.conversation_id}/notes`, {
            text: params.text
        });

        return {
            success: true,
            data: {
                conversationId: params.conversation_id,
                noteAdded: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to add note to conversation",
                retryable: false
            }
        };
    }
}
