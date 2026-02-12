import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

const emailSchema = z.object({
    from: z.string().email().describe("Sender email address"),
    to: z.string().describe("Recipient email address(es)"),
    cc: z.string().optional().describe("CC recipients"),
    bcc: z.string().optional().describe("BCC recipients"),
    subject: z.string().describe("Email subject"),
    htmlBody: z.string().optional().describe("HTML content"),
    textBody: z.string().optional().describe("Plain text content"),
    replyTo: z.string().email().optional().describe("Reply-to address"),
    tag: z.string().optional().describe("Email tag"),
    trackOpens: z.boolean().optional().describe("Track opens"),
    trackLinks: z
        .enum(["None", "HtmlAndText", "HtmlOnly", "TextOnly"])
        .optional()
        .describe("Track links"),
    metadata: z.record(z.string()).optional().describe("Custom metadata"),
    messageStream: z.string().optional().describe("Message stream ID")
});

export const sendBatchEmailsSchema = z.object({
    emails: z.array(emailSchema).min(1).max(500).describe("Array of emails to send (max 500)")
});

export type SendBatchEmailsParams = z.infer<typeof sendBatchEmailsSchema>;

export const sendBatchEmailsOperation: OperationDefinition = {
    id: "sendBatchEmails",
    name: "Send Batch Emails",
    description: "Send up to 500 emails in a single API request",
    category: "messaging",
    inputSchema: sendBatchEmailsSchema,
    retryable: false,
    timeout: 60000
};

export async function executeSendBatchEmails(
    client: PostmarkClient,
    params: SendBatchEmailsParams
): Promise<OperationResult> {
    try {
        const requests = params.emails.map((email) => {
            if (!email.htmlBody && !email.textBody) {
                throw new Error("Each email must have either htmlBody or textBody");
            }
            return {
                From: email.from,
                To: email.to,
                Cc: email.cc,
                Bcc: email.bcc,
                Subject: email.subject,
                HtmlBody: email.htmlBody,
                TextBody: email.textBody,
                ReplyTo: email.replyTo,
                Tag: email.tag,
                TrackOpens: email.trackOpens,
                TrackLinks: email.trackLinks,
                Metadata: email.metadata,
                MessageStream: email.messageStream
            };
        });

        const responses = await client.sendBatchEmails(requests);

        const successCount = responses.filter((r) => r.ErrorCode === 0).length;
        const failedCount = responses.filter((r) => r.ErrorCode !== 0).length;

        return {
            success: true,
            data: {
                total: responses.length,
                successCount,
                failedCount,
                results: responses.map((r) => ({
                    messageId: r.MessageID,
                    to: r.To,
                    submittedAt: r.SubmittedAt,
                    errorCode: r.ErrorCode,
                    message: r.Message
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send batch emails",
                retryable: false
            }
        };
    }
}
