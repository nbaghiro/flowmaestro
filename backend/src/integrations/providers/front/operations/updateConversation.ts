import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const updateConversationSchema = z.object({
    conversationId: z.string().describe("The conversation ID to update"),
    status: z
        .enum(["archived", "open", "spam", "deleted"])
        .optional()
        .describe("New status for the conversation"),
    assigneeId: z.string().optional().describe("Teammate ID to assign the conversation to"),
    inboxId: z.string().optional().describe("Inbox ID to move the conversation to")
});

export type UpdateConversationParams = z.infer<typeof updateConversationSchema>;

export const updateConversationOperation: OperationDefinition = {
    id: "updateConversation",
    name: "Update Conversation",
    description: "Update a conversation's status, assignee, or inbox",
    category: "data",
    inputSchema: updateConversationSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateConversation(
    client: FrontClient,
    params: UpdateConversationParams
): Promise<OperationResult> {
    try {
        if (!params.status && !params.assigneeId && !params.inboxId) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message:
                        "At least one update field (status, assigneeId, or inboxId) is required",
                    retryable: false
                }
            };
        }

        await client.updateConversation(params.conversationId, {
            status: params.status,
            assignee_id: params.assigneeId,
            inbox_id: params.inboxId
        });

        return {
            success: true,
            data: {
                updated: true,
                conversationId: params.conversationId,
                changes: {
                    status: params.status,
                    assigneeId: params.assigneeId,
                    inboxId: params.inboxId
                }
            }
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Failed to update conversation";
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
