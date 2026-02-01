import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Modify message input schema
 */
export const modifyMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to modify"),
    addLabelIds: z
        .array(z.string())
        .optional()
        .describe(
            "Label IDs to add (e.g., ['STARRED', 'IMPORTANT', 'Label_123'] or system labels like 'INBOX')"
        ),
    removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("Label IDs to remove (e.g., ['UNREAD', 'INBOX'])")
});

export type ModifyMessageParams = z.infer<typeof modifyMessageSchema>;

/**
 * Modify message operation definition
 */
export const modifyMessageOperation: OperationDefinition = {
    id: "modifyMessage",
    name: "Modify Gmail Message Labels",
    description:
        "Add or remove labels from a Gmail message (mark as read/unread, star, archive, etc.)",
    category: "messages",
    retryable: true,
    inputSchema: modifyMessageSchema
};

/**
 * Execute modify message operation
 */
export async function executeModifyMessage(
    client: GmailClient,
    params: ModifyMessageParams
): Promise<OperationResult> {
    try {
        // Validate at least one modification is specified
        if (
            (!params.addLabelIds || params.addLabelIds.length === 0) &&
            (!params.removeLabelIds || params.removeLabelIds.length === 0)
        ) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one of addLabelIds or removeLabelIds must be specified",
                    retryable: false
                }
            };
        }

        const result = await client.modifyMessage(
            params.messageId,
            params.addLabelIds,
            params.removeLabelIds
        );

        return {
            success: true,
            data: {
                messageId: result.id,
                threadId: result.threadId,
                labelIds: result.labelIds
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to modify message",
                retryable: true
            }
        };
    }
}
