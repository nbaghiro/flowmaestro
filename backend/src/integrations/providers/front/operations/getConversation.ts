import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const getConversationSchema = z.object({
    conversationId: z.string().describe("The conversation ID to retrieve")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Get a specific conversation by ID",
    category: "data",
    inputSchema: getConversationSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetConversation(
    client: FrontClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const conversation = await client.getConversation(params.conversationId);

        return {
            success: true,
            data: {
                id: conversation.id,
                subject: conversation.subject,
                status: conversation.status,
                assignee: conversation.assignee
                    ? {
                          id: conversation.assignee.id,
                          email: conversation.assignee.email,
                          name: `${conversation.assignee.first_name} ${conversation.assignee.last_name}`.trim()
                      }
                    : null,
                recipient: conversation.recipient
                    ? {
                          handle: conversation.recipient.handle,
                          role: conversation.recipient.role
                      }
                    : null,
                tags: conversation.tags.map((t) => ({ id: t.id, name: t.name })),
                createdAt: new Date(conversation.created_at * 1000).toISOString(),
                isPrivate: conversation.is_private,
                lastMessage: conversation.last_message
                    ? {
                          id: conversation.last_message.id,
                          type: conversation.last_message.type,
                          isInbound: conversation.last_message.is_inbound,
                          body: conversation.last_message.body,
                          blurb: conversation.last_message.blurb,
                          createdAt: new Date(
                              conversation.last_message.created_at * 1000
                          ).toISOString()
                      }
                    : null
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get conversation";
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
