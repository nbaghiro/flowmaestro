import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const sendMessageSchema = z.object({
    conversation_id: z.number().describe("Conversation ID to send message to"),
    body: z.string().describe("Message body text"),
    type: z
        .enum(["chat", "private_note"])
        .optional()
        .default("chat")
        .describe("Message type (chat=visible to contact, private_note=internal)")
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message in a conversation",
    category: "conversations",
    actionType: "write",
    inputSchema: sendMessageSchema,
    retryable: false,
    timeout: 10000
};

export async function executeSendMessage(
    client: DriftClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.post<{ data: { id: string; conversationId: number } }>(
            `/conversations/${params.conversation_id}/messages`,
            { body: params.body, type: params.type }
        );

        return {
            success: true,
            data: {
                messageId: response.data.id,
                conversationId: response.data.conversationId,
                sent: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: false
            }
        };
    }
}
