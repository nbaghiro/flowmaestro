import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

const recipientSchema = z.object({
    email: z.string().email().describe("Email address"),
    name: z.string().optional().describe("Display name")
});

export const sendEmailSchema = z.object({
    to: z.array(recipientSchema).min(1).describe("Recipients"),
    cc: z.array(recipientSchema).optional().describe("CC recipients"),
    bcc: z.array(recipientSchema).optional().describe("BCC recipients"),
    fromEmail: z.string().email().describe("Sender email address"),
    fromName: z.string().optional().describe("Sender display name"),
    replyTo: z.string().email().optional().describe("Reply-to email address"),
    subject: z.string().min(1).describe("Email subject"),
    textContent: z.string().optional().describe("Plain text content"),
    htmlContent: z.string().optional().describe("HTML content"),
    categories: z.array(z.string()).optional().describe("Email categories for tracking"),
    sendAt: z.number().optional().describe("Unix timestamp to schedule send"),
    trackOpens: z.boolean().optional().describe("Enable open tracking"),
    trackClicks: z.boolean().optional().describe("Enable click tracking")
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

export const sendEmailOperation: OperationDefinition = {
    id: "sendEmail",
    name: "Send Email",
    description: "Send a transactional email via SendGrid",
    category: "email",
    inputSchema: sendEmailSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendEmail(
    client: SendGridClient,
    params: SendEmailParams
): Promise<OperationResult> {
    try {
        if (!params.textContent && !params.htmlContent) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either textContent or htmlContent is required",
                    retryable: false
                }
            };
        }

        const content: Array<{ type: string; value: string }> = [];
        if (params.textContent) {
            content.push({ type: "text/plain", value: params.textContent });
        }
        if (params.htmlContent) {
            content.push({ type: "text/html", value: params.htmlContent });
        }

        await client.sendEmail({
            personalizations: [
                {
                    to: params.to,
                    cc: params.cc,
                    bcc: params.bcc,
                    send_at: params.sendAt
                }
            ],
            from: { email: params.fromEmail, name: params.fromName },
            reply_to: params.replyTo ? { email: params.replyTo } : undefined,
            subject: params.subject,
            content,
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
                recipientCount:
                    params.to.length + (params.cc?.length || 0) + (params.bcc?.length || 0)
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
