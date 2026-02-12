import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const sendTeamMessageSchema = z.object({
    chatId: z.string().describe("The chat/group ID to post to"),
    text: z.string().min(1).describe("Message text content")
});

export type SendTeamMessageParams = z.infer<typeof sendTeamMessageSchema>;

export const sendTeamMessageOperation: OperationDefinition = {
    id: "sendTeamMessage",
    name: "Send Team Message",
    description: "Post a message to a team messaging chat (RingCentral Team Messaging/Glip)",
    category: "messaging",
    inputSchema: sendTeamMessageSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendTeamMessage(
    client: RingCentralClient,
    params: SendTeamMessageParams
): Promise<OperationResult> {
    try {
        const message = await client.sendTeamMessage(params.chatId, {
            text: params.text
        });

        return {
            success: true,
            data: {
                messageId: message.id,
                groupId: message.groupId,
                type: message.type,
                text: message.text,
                creatorId: message.creatorId,
                createdAt: message.creationTime
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send team message";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
