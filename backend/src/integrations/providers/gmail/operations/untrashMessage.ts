import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Untrash message input schema
 */
export const untrashMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to remove from trash")
});

export type UntrashMessageParams = z.infer<typeof untrashMessageSchema>;

/**
 * Untrash message operation definition
 */
export const untrashMessageOperation: OperationDefinition = {
    id: "untrashMessage",
    name: "Untrash Gmail Message",
    description: "Remove a Gmail message from the trash folder and restore it to the inbox",
    category: "messages",
    retryable: true,
    inputSchema: untrashMessageSchema
};

/**
 * Execute untrash message operation
 */
export async function executeUntrashMessage(
    client: GmailClient,
    params: UntrashMessageParams
): Promise<OperationResult> {
    try {
        const result = await client.untrashMessage(params.messageId);

        return {
            success: true,
            data: {
                messageId: result.id,
                threadId: result.threadId,
                labelIds: result.labelIds,
                trashed: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to untrash message",
                retryable: true
            }
        };
    }
}
