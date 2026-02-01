import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient, SendGridEmailPersonalization } from "../client/SendGridClient";

const recipientSchema = z.object({
    email: z.string().email().describe("Email address"),
    name: z.string().optional().describe("Display name"),
    dynamicTemplateData: z.record(z.unknown()).optional().describe("Personalized template data")
});

export const sendBatchEmailSchema = z.object({
    recipients: z
        .array(recipientSchema)
        .min(1)
        .max(1000)
        .describe("Recipients (max 1000 per batch)"),
    fromEmail: z.string().email().describe("Sender email address"),
    fromName: z.string().optional().describe("Sender display name"),
    replyTo: z.string().email().optional().describe("Reply-to email address"),
    templateId: z.string().min(1).describe("SendGrid template ID"),
    subject: z.string().optional().describe("Subject (if not in template)"),
    categories: z.array(z.string()).optional().describe("Email categories for tracking"),
    trackOpens: z.boolean().optional().describe("Enable open tracking"),
    trackClicks: z.boolean().optional().describe("Enable click tracking")
});

export type SendBatchEmailParams = z.infer<typeof sendBatchEmailSchema>;

export const sendBatchEmailOperation: OperationDefinition = {
    id: "sendBatchEmail",
    name: "Send Batch Email",
    description: "Send personalized emails to multiple recipients using a SendGrid template",
    category: "email",
    inputSchema: sendBatchEmailSchema,
    retryable: false,
    timeout: 60000
};

export async function executeSendBatchEmail(
    client: SendGridClient,
    params: SendBatchEmailParams
): Promise<OperationResult> {
    try {
        // Create a personalization for each recipient
        const personalizations: SendGridEmailPersonalization[] = params.recipients.map((r) => ({
            to: [{ email: r.email, name: r.name }],
            dynamic_template_data: r.dynamicTemplateData
        }));

        await client.sendEmail({
            personalizations,
            from: { email: params.fromEmail, name: params.fromName },
            reply_to: params.replyTo ? { email: params.replyTo } : undefined,
            template_id: params.templateId,
            subject: params.subject,
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
                recipientCount: params.recipients.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send batch email",
                retryable: false
            }
        };
    }
}
