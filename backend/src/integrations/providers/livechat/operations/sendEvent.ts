import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const sendEventSchema = z.object({
    chat_id: z.string().describe("Chat ID to send event to"),
    event: z.object({
        type: z.literal("message").describe("Event type (message)"),
        text: z.string().describe("Message text")
    })
});

export type SendEventParams = z.infer<typeof sendEventSchema>;

export const sendEventOperation: OperationDefinition = {
    id: "sendEvent",
    name: "Send Event",
    description: "Send a message event in an active chat",
    category: "chats",
    actionType: "write",
    inputSchema: sendEventSchema,
    retryable: false,
    timeout: 10000
};

export async function executeSendEvent(
    client: LiveChatClient,
    params: SendEventParams
): Promise<OperationResult> {
    try {
        const response = await client.agentAction<{ event_id: string }>(
            "send_event",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                chatId: params.chat_id,
                eventId: response.event_id,
                sent: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send event",
                retryable: false
            }
        };
    }
}
