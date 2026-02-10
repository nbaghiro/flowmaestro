import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const replyToConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID to reply to"),
    text: z.string().describe("Reply body text (HTML supported)"),
    customer: z.object({
        email: z.string().email().describe("Customer email address")
    }),
    draft: z.boolean().optional().default(false).describe("Save as draft instead of sending"),
    status: z
        .enum(["active", "pending", "closed"])
        .optional()
        .describe("Set conversation status after replying")
});

export type ReplyToConversationParams = z.infer<typeof replyToConversationSchema>;

export const replyToConversationOperation: OperationDefinition = {
    id: "replyToConversation",
    name: "Reply to Conversation",
    description: "Add a reply thread to an existing conversation",
    category: "conversations",
    actionType: "write",
    inputSchema: replyToConversationSchema,
    retryable: false,
    timeout: 15000
};

export async function executeReplyToConversation(
    client: HelpScoutClient,
    params: ReplyToConversationParams
): Promise<OperationResult> {
    try {
        await client.post<null>(`/conversations/${params.conversation_id}/reply`, {
            customer: params.customer,
            text: params.text,
            draft: params.draft,
            status: params.status
        });

        return {
            success: true,
            data: {
                conversationId: params.conversation_id,
                replied: true,
                draft: params.draft || false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reply to conversation",
                retryable: false
            }
        };
    }
}
