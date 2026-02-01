import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const replyToMessageSchema = z.object({
    messageId: z.string().describe("ID of the message to reply to"),
    comment: z.string().describe("Reply content"),
    replyAll: z.boolean().optional().default(false).describe("Reply to all recipients")
});

export type ReplyToMessageParams = z.infer<typeof replyToMessageSchema>;

export const replyToMessageOperation: OperationDefinition = {
    id: "replyToMessage",
    name: "Reply to Message",
    description: "Reply to an email message",
    category: "email",
    inputSchema: replyToMessageSchema,
    retryable: false // Reply should not auto-retry to avoid duplicates
};

export async function executeReplyToMessage(
    client: MicrosoftOutlookClient,
    params: ReplyToMessageParams
): Promise<OperationResult> {
    try {
        await client.replyToMessage(params.messageId, params.comment, params.replyAll);
        return {
            success: true,
            data: {
                message: "Reply sent successfully",
                originalMessageId: params.messageId,
                replyAll: params.replyAll
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send reply",
                retryable: false
            }
        };
    }
}
