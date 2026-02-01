import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listChatMessagesSchema = z.object({
    chatId: z.string().describe("ID of the chat"),
    top: z.number().min(1).max(50).optional().describe("Maximum number of messages to return")
});

export type ListChatMessagesParams = z.infer<typeof listChatMessagesSchema>;

export const listChatMessagesOperation: OperationDefinition = {
    id: "listChatMessages",
    name: "List Chat Messages",
    description: "List messages in a Microsoft Teams chat",
    category: "messaging",
    inputSchema: listChatMessagesSchema,
    retryable: true
};

export async function executeListChatMessages(
    client: MicrosoftTeamsClient,
    params: ListChatMessagesParams
): Promise<OperationResult> {
    try {
        const result = await client.listChatMessages(params.chatId, params.top);
        return {
            success: true,
            data: {
                messages: result.value.map((msg) => ({
                    id: msg.id,
                    content: msg.body.content,
                    contentType: msg.body.contentType,
                    from: msg.from?.user?.displayName || msg.from?.application?.displayName,
                    createdDateTime: msg.createdDateTime,
                    messageType: msg.messageType
                })),
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list chat messages",
                retryable: true
            }
        };
    }
}
