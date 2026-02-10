import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const transferChatSchema = z.object({
    id: z.string().describe("Chat ID to transfer"),
    target: z.object({
        type: z.enum(["agent", "group"]).describe("Transfer target type"),
        ids: z.array(z.union([z.string(), z.number()])).describe("Target agent or group IDs")
    })
});

export type TransferChatParams = z.infer<typeof transferChatSchema>;

export const transferChatOperation: OperationDefinition = {
    id: "transferChat",
    name: "Transfer Chat",
    description: "Transfer a chat to another agent or group",
    category: "chats",
    actionType: "write",
    inputSchema: transferChatSchema,
    retryable: true,
    timeout: 10000
};

export async function executeTransferChat(
    client: LiveChatClient,
    params: TransferChatParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>(
            "transfer_chat",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                chatId: params.id,
                transferred: true,
                target: params.target
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to transfer chat",
                retryable: true
            }
        };
    }
}
