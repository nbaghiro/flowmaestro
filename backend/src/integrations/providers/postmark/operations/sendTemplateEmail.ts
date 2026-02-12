import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const sendTemplateEmailSchema = z.object({
    from: z.string().email().describe("Sender email address (must be verified)"),
    to: z.string().describe("Recipient email address(es), comma-separated for multiple"),
    cc: z.string().optional().describe("CC email address(es), comma-separated"),
    bcc: z.string().optional().describe("BCC email address(es), comma-separated"),
    templateId: z.number().optional().describe("Template ID to use"),
    templateAlias: z
        .string()
        .optional()
        .describe("Template alias to use (alternative to templateId)"),
    templateModel: z.record(z.unknown()).describe("Template variables/data"),
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

export type SendTemplateEmailParams = z.infer<typeof sendTemplateEmailSchema>;

export const sendTemplateEmailOperation: OperationDefinition = {
    id: "sendTemplateEmail",
    name: "Send Template Email",
    description: "Send an email using a pre-defined Postmark template",
    category: "messaging",
    inputSchema: sendTemplateEmailSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendTemplateEmail(
    client: PostmarkClient,
    params: SendTemplateEmailParams
): Promise<OperationResult> {
    try {
        if (!params.templateId && !params.templateAlias) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either templateId or templateAlias is required",
                    retryable: false
                }
            };
        }

        const response = await client.sendTemplateEmail({
            From: params.from,
            To: params.to,
            Cc: params.cc,
            Bcc: params.bcc,
            TemplateId: params.templateId,
            TemplateAlias: params.templateAlias,
            TemplateModel: params.templateModel,
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
                message: error instanceof Error ? error.message : "Failed to send template email",
                retryable: false
            }
        };
    }
}
