import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const untagThreadSchema = z.object({
    chat_id: z.string().describe("Chat ID"),
    thread_id: z.string().describe("Thread ID"),
    tag: z.string().describe("Tag to remove")
});

export type UntagThreadParams = z.infer<typeof untagThreadSchema>;

export const untagThreadOperation: OperationDefinition = {
    id: "untagThread",
    name: "Untag Thread",
    description: "Remove a tag from a chat thread",
    category: "tags",
    actionType: "write",
    inputSchema: untagThreadSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUntagThread(
    client: LiveChatClient,
    params: UntagThreadParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>(
            "untag_thread",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                chatId: params.chat_id,
                threadId: params.thread_id,
                tag: params.tag,
                untagged: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to untag thread",
                retryable: true
            }
        };
    }
}
