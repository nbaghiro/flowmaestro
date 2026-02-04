import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatChatResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getChatSchema = z.object({
    chat_id: z.string().describe("Chat ID"),
    thread_id: z.string().optional().describe("Specific thread ID (latest if omitted)")
});

export type GetChatParams = z.infer<typeof getChatSchema>;

export const getChatOperation: OperationDefinition = {
    id: "getChat",
    name: "Get Chat",
    description: "Get a specific chat with thread events",
    category: "chats",
    actionType: "read",
    inputSchema: getChatSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetChat(
    client: LiveChatClient,
    params: GetChatParams
): Promise<OperationResult> {
    try {
        const payload: Record<string, unknown> = { chat_id: params.chat_id };
        if (params.thread_id) payload.thread_id = params.thread_id;

        const response = await client.agentAction<LiveChatChatResponse>("get_chat", payload);

        return {
            success: true,
            data: {
                id: response.id,
                thread: {
                    id: response.thread.id,
                    active: response.thread.active,
                    createdAt: response.thread.created_at,
                    events: response.thread.events?.map((e) => ({
                        id: e.id,
                        type: e.type,
                        text: e.text,
                        authorId: e.author_id,
                        createdAt: e.created_at
                    })),
                    tags: response.thread.tags
                },
                users: response.users
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get chat",
                retryable: true
            }
        };
    }
}
