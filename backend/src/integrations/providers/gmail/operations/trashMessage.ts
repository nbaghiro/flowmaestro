import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Trash message input schema
 */
export const trashMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to move to trash")
});

export type TrashMessageParams = z.infer<typeof trashMessageSchema>;

/**
 * Trash message operation definition
 */
export const trashMessageOperation: OperationDefinition = {
    id: "trashMessage",
    name: "Trash Gmail Message",
    description: "Move a Gmail message to the trash folder (can be recovered within 30 days)",
    category: "messages",
    retryable: true,
    inputSchema: trashMessageSchema
};

/**
 * Execute trash message operation
 */
export async function executeTrashMessage(
    client: GmailClient,
    params: TrashMessageParams
): Promise<OperationResult> {
    try {
        const result = await client.trashMessage(params.messageId);

        return {
            success: true,
            data: {
                messageId: result.id,
                threadId: result.threadId,
                labelIds: result.labelIds,
                trashed: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to trash message",
                retryable: true
            }
        };
    }
}
