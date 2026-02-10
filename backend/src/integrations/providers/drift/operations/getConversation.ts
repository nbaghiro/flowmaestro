import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftConversationResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Get a single conversation by ID",
    category: "conversations",
    actionType: "read",
    inputSchema: getConversationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetConversation(
    client: DriftClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const response = await client.get<DriftConversationResponse>(
            `/conversations/${params.conversation_id}`
        );

        const c = response.data;
        return {
            success: true,
            data: {
                id: c.id,
                status: c.status,
                contactId: c.contactId,
                inboxId: c.inboxId,
                conversationType: c.conversationType,
                relatedPlaybookId: c.relatedPlaybookId,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get conversation",
                retryable: true
            }
        };
    }
}
