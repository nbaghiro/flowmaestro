import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const sendEmailSchema = z.object({
    from: z.string().email().describe("Sender email address (must be verified)"),
    to: z.string().describe("Recipient email address(es), comma-separated for multiple"),
    cc: z.string().optional().describe("CC email address(es), comma-separated"),
    bcc: z.string().optional().describe("BCC email address(es), comma-separated"),
    subject: z.string().min(1).describe("Email subject line"),
    htmlBody: z.string().optional().describe("HTML email content"),
    textBody: z.string().optional().describe("Plain text email content"),
    replyTo: z.string().email().optional().describe("Reply-to email address"),
    tag: z.string().optional().describe("Tag for categorizing emails"),
    trackOpens: z.boolean().optional().describe("Enable open tracking"),
    trackLinks: z
        .enum(["None", "HtmlAndText", "HtmlOnly", "TextOnly"])
        .optional()
        .describe("Link tracking mode"),
    metadata: z.record(z.string()).optional().describe("Custom metadata key-value pairs"),
    messageStream: z.string().optional().describe("Message stream ID (default: outbound)")
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

export const sendEmailOperation: OperationDefinition = {
    id: "sendEmail",
    name: "Send Email",
    description: "Send a single transactional email via Postmark",
    category: "messaging",
    inputSchema: sendEmailSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendEmail(
    client: PostmarkClient,
    params: SendEmailParams
): Promise<OperationResult> {
    try {
        if (!params.htmlBody && !params.textBody) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either htmlBody or textBody is required",
                    retryable: false
                }
            };
        }

        const response = await client.sendEmail({
            From: params.from,
            To: params.to,
            Cc: params.cc,
            Bcc: params.bcc,
            Subject: params.subject,
            HtmlBody: params.htmlBody,
            TextBody: params.textBody,
            ReplyTo: params.replyTo,
            Tag: params.tag,
            TrackOpens: params.trackOpens,
            TrackLinks: params.trackLinks,
            Metadata: params.metadata,
            MessageStream: params.messageStream
        });

        return {
            success: true,
            data: {
                messageId: response.MessageID,
                to: response.To,
                submittedAt: response.SubmittedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send email",
                retryable: false
            }
        };
    }
}
