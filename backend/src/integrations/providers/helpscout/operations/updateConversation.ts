import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID"),
    op: z.literal("replace").default("replace").describe("Operation type"),
    path: z
        .enum(["/subject", "/mailboxId", "/status", "/assignTo"])
        .describe("Field path to update"),
    value: z.union([z.string(), z.number()]).describe("New value for the field")
});

export type UpdateConversationParams = z.infer<typeof updateConversationSchema>;

export const updateConversationOperation: OperationDefinition = {
    id: "updateConversation",
    name: "Update Conversation",
    description: "Update a conversation field (subject, mailbox, status, or assignee)",
    category: "conversations",
    actionType: "write",
    inputSchema: updateConversationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateConversation(
    client: HelpScoutClient,
    params: UpdateConversationParams
): Promise<OperationResult> {
    try {
        await client.patch<null>(`/conversations/${params.conversation_id}`, {
            op: params.op,
            path: params.path,
            value: params.value
        });

        return {
            success: true,
            data: {
                conversationId: params.conversation_id,
                updated: true,
                field: params.path,
                value: params.value
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update conversation",
                retryable: true
            }
        };
    }
}
