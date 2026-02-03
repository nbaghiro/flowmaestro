import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutConversation } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getConversationSchema = z.object({
    conversation_id: z.number().describe("Conversation ID")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Get a single conversation by ID with all thread details",
    category: "conversations",
    actionType: "read",
    inputSchema: getConversationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetConversation(
    client: HelpScoutClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const response = await client.get<HelpScoutConversation>(
            `/conversations/${params.conversation_id}?embed=threads`
        );

        return {
            success: true,
            data: {
                id: response.id,
                number: response.number,
                type: response.type,
                status: response.status,
                subject: response.subject,
                preview: response.preview,
                mailboxId: response.mailboxId,
                assignee: response.assignee,
                primaryCustomer: response.primaryCustomer,
                tags: response.tags,
                threads: response._embedded?.threads?.map((t) => ({
                    id: t.id,
                    type: t.type,
                    status: t.status,
                    body: t.body,
                    createdBy: t.createdBy,
                    createdAt: t.createdAt
                })),
                createdAt: response.createdAt,
                closedAt: response.closedAt
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
