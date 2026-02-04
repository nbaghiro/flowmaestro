import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatStartChatResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const startChatSchema = z.object({
    chat: z
        .object({
            properties: z.record(z.record(z.unknown())).optional().describe("Chat properties"),
            access: z
                .object({
                    group_ids: z.array(z.number()).optional().describe("Group IDs for access")
                })
                .optional()
        })
        .optional()
        .describe("Chat configuration"),
    thread: z
        .object({
            events: z
                .array(
                    z.object({
                        type: z.literal("message").describe("Event type"),
                        text: z.string().describe("Message text")
                    })
                )
                .optional()
                .describe("Initial events/messages"),
            properties: z.record(z.record(z.unknown())).optional()
        })
        .optional()
        .describe("Initial thread configuration")
});

export type StartChatParams = z.infer<typeof startChatSchema>;

export const startChatOperation: OperationDefinition = {
    id: "startChat",
    name: "Start Chat",
    description: "Start a new chat with optional initial message",
    category: "chats",
    actionType: "write",
    inputSchema: startChatSchema,
    retryable: false,
    timeout: 15000
};

export async function executeStartChat(
    client: LiveChatClient,
    params: StartChatParams
): Promise<OperationResult> {
    try {
        const response = await client.agentAction<LiveChatStartChatResponse>(
            "start_chat",
            params as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                chatId: response.chat_id,
                threadId: response.thread_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to start chat",
                retryable: false
            }
        };
    }
}
