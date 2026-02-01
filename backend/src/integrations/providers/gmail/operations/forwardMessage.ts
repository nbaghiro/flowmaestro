import { z } from "zod";
import {
    buildForwardEmail,
    toBase64Url,
    extractHeaders,
    extractPlainTextBody
} from "../utils/email-builder";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Forward message input schema
 */
export const forwardMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to forward"),
    to: z
        .union([z.string().email(), z.array(z.string().email())])
        .describe("Recipient email address(es) to forward to"),
    cc: z
        .union([z.string().email(), z.array(z.string().email())])
        .optional()
        .describe("CC recipient email address(es)"),
    body: z
        .string()
        .optional()
        .default("")
        .describe("Additional message to include above the forwarded content"),
    bodyType: z.enum(["text", "html"]).optional().default("text").describe("Body content type"),
    attachments: z
        .array(
            z.object({
                filename: z.string(),
                content: z.string(),
                mimeType: z.string()
            })
        )
        .optional()
        .describe("Additional attachments (original attachments are not automatically included)")
});

export type ForwardMessageParams = z.infer<typeof forwardMessageSchema>;

/**
 * Forward message operation definition
 */
export const forwardMessageOperation: OperationDefinition = {
    id: "forwardMessage",
    name: "Forward Gmail Message",
    description: "Forward an existing email message to new recipients",
    category: "messages",
    retryable: false,
    inputSchema: forwardMessageSchema
};

/**
 * Execute forward message operation
 */
export async function executeForwardMessage(
    client: GmailClient,
    params: ForwardMessageParams
): Promise<OperationResult> {
    try {
        // Get the original message
        const originalMessage = await client.getMessage(params.messageId, "full");

        if (!originalMessage.payload) {
            throw new Error("Could not retrieve original message content");
        }

        const headers = extractHeaders(originalMessage.payload.headers || []);

        // Extract original message details
        const originalFrom = headers["from"] || "Unknown";
        const originalTo = headers["to"] || "Unknown";
        const originalSubject = headers["subject"] || "(No Subject)";
        const originalDate = headers["date"] || new Date().toISOString();
        const originalBody = extractPlainTextBody(originalMessage.payload) || "";

        // Build subject with Fwd: prefix if not already present
        const subject = originalSubject.toLowerCase().startsWith("fwd:")
            ? originalSubject
            : `Fwd: ${originalSubject}`;

        // Build the forward email
        const rawEmail = buildForwardEmail({
            to: params.to,
            cc: params.cc,
            subject,
            body: params.body || "",
            bodyType: params.bodyType || "text",
            attachments: params.attachments,
            originalMessage: {
                from: originalFrom,
                to: originalTo,
                date: originalDate,
                subject: originalSubject,
                body: originalBody
            }
        });

        // Encode to base64url
        const encodedEmail = toBase64Url(rawEmail);

        // Send the forwarded message (new thread)
        const result = await client.sendMessage(encodedEmail);

        return {
            success: true,
            data: {
                messageId: result.id,
                threadId: result.threadId,
                labelIds: result.labelIds,
                forwardedFrom: params.messageId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to forward message",
                retryable: false
            }
        };
    }
}
