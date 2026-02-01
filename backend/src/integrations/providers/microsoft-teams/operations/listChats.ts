import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listChatsSchema = z.object({
    top: z.number().min(1).max(50).optional().describe("Maximum number of chats to return")
});

export type ListChatsParams = z.infer<typeof listChatsSchema>;

export const listChatsOperation: OperationDefinition = {
    id: "listChats",
    name: "List Chats",
    description: "List user's Microsoft Teams chats (1:1 and group chats)",
    category: "chats",
    inputSchema: listChatsSchema,
    retryable: true
};

export async function executeListChats(
    client: MicrosoftTeamsClient,
    params: ListChatsParams
): Promise<OperationResult> {
    try {
        const result = await client.listChats(params.top);
        return {
            success: true,
            data: {
                chats: result.value.map((chat) => ({
                    id: chat.id,
                    topic: chat.topic,
                    chatType: chat.chatType,
                    webUrl: chat.webUrl,
                    lastUpdatedDateTime: chat.lastUpdatedDateTime
                })),
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list chats",
                retryable: true
            }
        };
    }
}
