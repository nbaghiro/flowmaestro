import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listChannelMessagesSchema = z.object({
    teamId: z.string().describe("ID of the team"),
    channelId: z.string().describe("ID of the channel"),
    top: z.number().min(1).max(50).optional().describe("Maximum number of messages to return")
});

export type ListChannelMessagesParams = z.infer<typeof listChannelMessagesSchema>;

export const listChannelMessagesOperation: OperationDefinition = {
    id: "listChannelMessages",
    name: "List Channel Messages",
    description: "List messages in a Microsoft Teams channel",
    category: "messaging",
    inputSchema: listChannelMessagesSchema,
    retryable: true
};

export async function executeListChannelMessages(
    client: MicrosoftTeamsClient,
    params: ListChannelMessagesParams
): Promise<OperationResult> {
    try {
        const result = await client.listChannelMessages(
            params.teamId,
            params.channelId,
            params.top
        );
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
                message: error instanceof Error ? error.message : "Failed to list messages",
                retryable: true
            }
        };
    }
}
