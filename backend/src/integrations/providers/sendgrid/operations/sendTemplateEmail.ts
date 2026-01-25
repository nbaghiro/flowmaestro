import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

const recipientSchema = z.object({
    email: z.string().email().describe("Email address"),
    name: z.string().optional().describe("Display name")
});

export const sendTemplateEmailSchema = z.object({
    to: z.array(recipientSchema).min(1).describe("Recipients"),
    cc: z.array(recipientSchema).optional().describe("CC recipients"),
    bcc: z.array(recipientSchema).optional().describe("BCC recipients"),
    fromEmail: z.string().email().describe("Sender email address"),
    fromName: z.string().optional().describe("Sender display name"),
    replyTo: z.string().email().optional().describe("Reply-to email address"),
    templateId: z.string().min(1).describe("SendGrid template ID"),
    dynamicTemplateData: z
        .record(z.unknown())
        .optional()
        .describe("Dynamic template data (variables)"),
    categories: z.array(z.string()).optional().describe("Email categories for tracking"),
    sendAt: z.number().optional().describe("Unix timestamp to schedule send"),
    trackOpens: z.boolean().optional().describe("Enable open tracking"),
    trackClicks: z.boolean().optional().describe("Enable click tracking")
});

export type SendTemplateEmailParams = z.infer<typeof sendTemplateEmailSchema>;

export const sendTemplateEmailOperation: OperationDefinition = {
    id: "sendTemplateEmail",
    name: "Send Template Email",
    description: "Send an email using a SendGrid dynamic template",
    category: "email",
    inputSchema: sendTemplateEmailSchema,
    inputSchemaJSON: toJSONSchema(sendTemplateEmailSchema),
    retryable: false,
    timeout: 30000
};

export async function executeSendTemplateEmail(
    client: SendGridClient,
    params: SendTemplateEmailParams
): Promise<OperationResult> {
    try {
        await client.sendEmail({
            personalizations: [
                {
                    to: params.to,
                    cc: params.cc,
                    bcc: params.bcc,
                    dynamic_template_data: params.dynamicTemplateData,
                    send_at: params.sendAt
                }
            ],
            from: { email: params.fromEmail, name: params.fromName },
            reply_to: params.replyTo ? { email: params.replyTo } : undefined,
            template_id: params.templateId,
            categories: params.categories,
            tracking_settings: {
                open_tracking:
                    params.trackOpens !== undefined ? { enable: params.trackOpens } : undefined,
                click_tracking:
                    params.trackClicks !== undefined ? { enable: params.trackClicks } : undefined
            }
        });

        return {
            success: true,
            data: {
                sent: true,
                templateId: params.templateId,
                recipientCount:
                    params.to.length + (params.cc?.length || 0) + (params.bcc?.length || 0)
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
