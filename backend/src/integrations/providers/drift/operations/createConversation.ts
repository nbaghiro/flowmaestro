import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftConversationResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createConversationSchema = z.object({
    email: z.string().email().describe("Email address of the contact to start conversation with"),
    message: z.object({
        body: z.string().describe("Initial message body")
    })
});

export type CreateConversationParams = z.infer<typeof createConversationSchema>;

export const createConversationOperation: OperationDefinition = {
    id: "createConversation",
    name: "Create Conversation",
    description: "Create a new conversation with a contact",
    category: "conversations",
    actionType: "write",
    inputSchema: createConversationSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateConversation(
    client: DriftClient,
    params: CreateConversationParams
): Promise<OperationResult> {
    try {
        const response = await client.post<DriftConversationResponse>("/conversations/new", params);

        const c = response.data;
        return {
            success: true,
            data: {
                id: c.id,
                status: c.status,
                contactId: c.contactId,
                createdAt: c.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create conversation",
                retryable: false
            }
        };
    }
}
