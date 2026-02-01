import { z } from "zod";
import { buildRawEmail, toBase64Url } from "../utils/email-builder";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Send message input schema
 */
export const sendMessageSchema = z.object({
    to: z
        .union([z.string().email(), z.array(z.string().email())])
        .describe("Recipient email address(es)"),
    cc: z
        .union([z.string().email(), z.array(z.string().email())])
        .optional()
        .describe("CC recipient email address(es)"),
    bcc: z
        .union([z.string().email(), z.array(z.string().email())])
        .optional()
        .describe("BCC recipient email address(es)"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    bodyType: z
        .enum(["text", "html"])
        .optional()
        .default("text")
        .describe("Body content type: 'text' for plain text, 'html' for HTML"),
    attachments: z
        .array(
            z.object({
                filename: z.string().describe("Name of the attachment file"),
                content: z.string().describe("Base64 encoded file content"),
                mimeType: z.string().describe("MIME type of the attachment")
            })
        )
        .optional()
        .describe("File attachments"),
    replyTo: z.string().email().optional().describe("Reply-To email address")
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

/**
 * Send message operation definition
 */
export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Gmail Message",
    description: "Send a new email message with optional attachments",
    category: "messages",
    retryable: false, // Don't retry sends to avoid duplicates
    inputSchema: sendMessageSchema
};

/**
 * Execute send message operation
 */
export async function executeSendMessage(
    client: GmailClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        // Build RFC 2822 formatted email
        const rawEmail = buildRawEmail({
            to: params.to,
            cc: params.cc,
            bcc: params.bcc,
            subject: params.subject,
            body: params.body,
            bodyType: params.bodyType || "text",
            attachments: params.attachments,
            replyTo: params.replyTo
        });

        // Encode to base64url as required by Gmail API
        const encodedEmail = toBase64Url(rawEmail);

        // Send the message
        const result = await client.sendMessage(encodedEmail);

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
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: false
            }
        };
    }
}
