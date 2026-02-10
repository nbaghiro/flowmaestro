import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createConversationSchema = z.object({
    subject: z.string().describe("Conversation subject"),
    type: z.enum(["email", "phone", "chat"]).default("email").describe("Conversation type"),
    mailboxId: z.number().describe("Mailbox ID to create conversation in"),
    customer: z.object({
        email: z.string().email().describe("Customer email address")
    }),
    threads: z
        .array(
            z.object({
                type: z.enum(["customer", "reply", "note"]).describe("Thread type"),
                text: z.string().describe("Thread body text")
            })
        )
        .min(1)
        .describe("Initial thread(s) for the conversation"),
    tags: z.array(z.string()).optional().describe("Tags to assign"),
    assignTo: z.number().optional().describe("User ID to assign to"),
    status: z
        .enum(["active", "pending", "closed"])
        .optional()
        .default("active")
        .describe("Initial status")
});

export type CreateConversationParams = z.infer<typeof createConversationSchema>;

export const createConversationOperation: OperationDefinition = {
    id: "createConversation",
    name: "Create Conversation",
    description: "Create a new conversation in a mailbox",
    category: "conversations",
    actionType: "write",
    inputSchema: createConversationSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateConversation(
    client: HelpScoutClient,
    params: CreateConversationParams
): Promise<OperationResult> {
    try {
        const response = await client.post<null>("/conversations", params);

        return {
            success: true,
            data: {
                created: true,
                conversation: response
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
