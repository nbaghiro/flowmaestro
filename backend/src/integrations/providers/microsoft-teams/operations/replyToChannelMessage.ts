import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const replyToChannelMessageSchema = z.object({
    teamId: z.string().describe("ID of the team"),
    channelId: z.string().describe("ID of the channel"),
    messageId: z.string().describe("ID of the message to reply to"),
    content: z.string().describe("Reply content"),
    contentType: z
        .enum(["text", "html"])
        .optional()
        .default("text")
        .describe("Content type: 'text' or 'html'")
});

export type ReplyToChannelMessageParams = z.infer<typeof replyToChannelMessageSchema>;

export const replyToChannelMessageOperation: OperationDefinition = {
    id: "replyToChannelMessage",
    name: "Reply to Channel Message",
    description: "Reply to a message in a Microsoft Teams channel",
    category: "messaging",
    inputSchema: replyToChannelMessageSchema,
    retryable: true
};

export async function executeReplyToChannelMessage(
    client: MicrosoftTeamsClient,
    params: ReplyToChannelMessageParams
): Promise<OperationResult> {
    try {
        const result = await client.replyToChannelMessage(
            params.teamId,
            params.channelId,
            params.messageId,
            params.content,
            params.contentType
        );
        return {
            success: true,
            data: {
                messageId: result.id,
                createdDateTime: result.createdDateTime
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reply to message",
                retryable: true
            }
        };
    }
}
