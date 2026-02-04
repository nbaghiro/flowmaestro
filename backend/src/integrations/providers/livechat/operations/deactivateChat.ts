import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deactivateChatSchema = z.object({
    id: z.string().describe("Chat ID to deactivate (close)")
});

export type DeactivateChatParams = z.infer<typeof deactivateChatSchema>;

export const deactivateChatOperation: OperationDefinition = {
    id: "deactivateChat",
    name: "Deactivate Chat",
    description: "Close an active chat thread",
    category: "chats",
    actionType: "write",
    inputSchema: deactivateChatSchema,
    retryable: true,
    timeout: 10000
};

export async function executeDeactivateChat(
    client: LiveChatClient,
    params: DeactivateChatParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>("deactivate_chat", { id: params.id });

        return {
            success: true,
            data: {
                chatId: params.id,
                deactivated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to deactivate chat",
                retryable: true
            }
        };
    }
}
