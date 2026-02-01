import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const sendChannelMessageSchema = z.object({
    teamId: z.string().describe("ID of the team"),
    channelId: z.string().describe("ID of the channel"),
    content: z.string().describe("Message content"),
    contentType: z
        .enum(["text", "html"])
        .optional()
        .default("text")
        .describe("Content type: 'text' or 'html'")
});

export type SendChannelMessageParams = z.infer<typeof sendChannelMessageSchema>;

export const sendChannelMessageOperation: OperationDefinition = {
    id: "sendChannelMessage",
    name: "Send Channel Message",
    description: "Send a message to a Microsoft Teams channel",
    category: "messaging",
    inputSchema: sendChannelMessageSchema,
    retryable: true
};

export async function executeSendChannelMessage(
    client: MicrosoftTeamsClient,
    params: SendChannelMessageParams
): Promise<OperationResult> {
    try {
        const result = await client.sendChannelMessage(
            params.teamId,
            params.channelId,
            params.content,
            params.contentType
        );
        return {
            success: true,
            data: {
                messageId: result.id,
                createdDateTime: result.createdDateTime,
                webUrl: result.webUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: true
            }
        };
    }
}
