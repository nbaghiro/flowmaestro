import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const tagThreadSchema = z.object({
    chat_id: z.string().describe("Chat ID"),
    thread_id: z.string().describe("Thread ID"),
    tag: z.string().describe("Tag to add")
});

export type TagThreadParams = z.infer<typeof tagThreadSchema>;

export const tagThreadOperation: OperationDefinition = {
    id: "tagThread",
    name: "Tag Thread",
    description: "Add a tag to a chat thread",
    category: "tags",
    actionType: "write",
    inputSchema: tagThreadSchema,
    retryable: true,
    timeout: 10000
};

export async function executeTagThread(
    client: LiveChatClient,
    params: TagThreadParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>(
            "tag_thread",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                chatId: params.chat_id,
                threadId: params.thread_id,
                tag: params.tag,
                tagged: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to tag thread",
                retryable: true
            }
        };
    }
}
