import { z } from "zod";
import { buildReplyEmail, toBase64Url, extractHeaders } from "../utils/email-builder";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Reply to message input schema
 */
export const replyToMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to reply to"),
    body: z.string().describe("Reply body content"),
    bodyType: z.enum(["text", "html"]).optional().default("text").describe("Body content type"),
    replyAll: z
        .boolean()
        .optional()
        .default(false)
        .describe("Reply to all recipients (CC included)"),
    attachments: z
        .array(
            z.object({
                filename: z.string(),
                content: z.string(),
                mimeType: z.string()
            })
        )
        .optional()
        .describe("File attachments for the reply")
});

export type ReplyToMessageParams = z.infer<typeof replyToMessageSchema>;

/**
 * Reply to message operation definition
 */
export const replyToMessageOperation: OperationDefinition = {
    id: "replyToMessage",
    name: "Reply to Gmail Message",
    description: "Reply to an existing email message, maintaining the conversation thread",
    category: "messages",
    retryable: false,
    inputSchema: replyToMessageSchema
};

/**
 * Execute reply to message operation
 */
export async function executeReplyToMessage(
    client: GmailClient,
    params: ReplyToMessageParams
): Promise<OperationResult> {
    try {
        // Get the original message to extract headers for threading
        const originalMessage = await client.getMessage(params.messageId, "metadata", [
            "From",
            "To",
            "Cc",
            "Subject",
            "Message-ID",
            "References"
        ]);

        if (!originalMessage.payload) {
            throw new Error("Could not retrieve original message headers");
        }

        const headers = extractHeaders(originalMessage.payload.headers || []);

        // Determine recipients
        const originalFrom = headers["from"] || "";
        const originalTo = headers["to"] || "";
        const originalCc = headers["cc"];
        const originalSubject = headers["subject"] || "";
        const originalMessageId = headers["message-id"] || "";
        const originalReferences = headers["references"];

        // For reply, send to original sender
        // For reply-all, include original To and CC (excluding self)
        const to = originalFrom;
        let cc: string | undefined;

        if (params.replyAll) {
            // Combine original To and CC for reply-all
            const allRecipients = [originalTo, originalCc].filter(Boolean).join(", ");
            if (allRecipients) {
                cc = allRecipients;
            }
        }

        // Build subject with Re: prefix if not already present
        const subject = originalSubject.toLowerCase().startsWith("re:")
            ? originalSubject
            : `Re: ${originalSubject}`;

        // Build the reply email with proper threading headers
        const rawEmail = buildReplyEmail({
            to,
            cc,
            subject,
            body: params.body,
            bodyType: params.bodyType || "text",
            attachments: params.attachments,
            originalMessageId,
            originalReferences
        });

        // Encode to base64url
        const encodedEmail = toBase64Url(rawEmail);

        // Send the reply in the same thread
        const result = await client.sendMessage(encodedEmail, originalMessage.threadId);

        return {
            success: true,
            data: {
                messageId: result.id,
                threadId: result.threadId,
                labelIds: result.labelIds,
                inReplyTo: originalMessageId
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
