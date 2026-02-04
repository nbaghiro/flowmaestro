import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftMessagesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getConversationMessagesSchema = z.object({
    conversation_id: z.number().describe("Conversation ID"),
    next: z.string().optional().describe("Pagination cursor for next page")
});

export type GetConversationMessagesParams = z.infer<typeof getConversationMessagesSchema>;

export const getConversationMessagesOperation: OperationDefinition = {
    id: "getConversationMessages",
    name: "Get Conversation Messages",
    description: "Get messages in a conversation",
    category: "conversations",
    actionType: "read",
    inputSchema: getConversationMessagesSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetConversationMessages(
    client: DriftClient,
    params: GetConversationMessagesParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.next) queryParams.set("next", params.next);

        const qs = queryParams.toString();
        const response = await client.get<DriftMessagesResponse>(
            `/conversations/${params.conversation_id}/messages${qs ? `?${qs}` : ""}`
        );

        return {
            success: true,
            data: {
                messages: response.data.messages.map((m) => ({
                    id: m.id,
                    conversationId: m.conversationId,
                    body: m.body,
                    type: m.type,
                    author: m.author,
                    createdAt: m.createdAt,
                    buttons: m.buttons
                })),
                pagination: response.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get conversation messages",
                retryable: true
            }
        };
    }
}
